import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/server';
import { flightSchema } from '@/lib/travel/schema';
import { flights, TravelError } from '@/lib/travel/provider';
import { dateInZone, dueOnLocalDay, validTimeZone } from '@/lib/travel/time-zone';
export const dynamic = 'force-dynamic';
function authorized(header: string | null) {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 32 || !header?.startsWith('Bearer ')) return false;
  const actual = Buffer.from(header.slice(7));
  const secret = Buffer.from(expected);
  return actual.length === secret.length && timingSafeEqual(actual, secret);
}
export async function POST(request: Request) {
  if (!authorized(request.headers.get('authorization'))) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  try {
    const admin = adminClient();
    const userId = process.env.OWNER_USER_ID;
    if (!userId) return NextResponse.json({ error: 'Conta não configurada.' }, { status: 503 });
    const now = new Date();
    const { data: preferences, error: preferenceError } = await admin.from('user_preferences').select('time_zone').eq('user_id', userId).maybeSingle();
    if (preferenceError) throw preferenceError;
    if (!validTimeZone(preferences?.time_zone)) return NextResponse.json({ processed: 0, attempted: 0, quotaStopped: false, configured: false });
    const timeZone = preferences.time_zone;
    const today = dateInZone(now, timeZone);
    const cutoff = new Date(now.getTime() - 20 * 3600 * 1000).toISOString();
    const { data: searches, error } = await admin.from('saved_searches').select('*').eq('user_id', userId).eq('active', true).gte('monitor_until', today).gte('departure_date', today).or(`last_attempt_at.is.null,last_attempt_at.lte.${cutoff}`).order('last_attempt_at', { ascending: true, nullsFirst: true }).limit(1000);
    if (error) throw error;
    let processed = 0;
    let attempted = 0;
    let quotaStopped = false;
    for (const search of (searches ?? []).filter(search => dueOnLocalDay(search, now, timeZone)).slice(0, 3)) {
      const claimedAt = new Date().toISOString();
      const { data: claimed, error: claimError } = await admin.rpc('claim_due_search', { p_search_id: search.id, p_user_id: userId, p_now: claimedAt });
      if (claimError) throw claimError;
      if (!claimed) continue;
      attempted++;
      const parsed = flightSchema.safeParse({ origin: search.origin, destination: search.destination, destinationName: search.destination_name, departureDate: search.departure_date, returnDate: search.return_date, passengers: search.passengers, maxPrice: search.max_price, maxStops: search.max_stops });
      if (!parsed.success) continue;
      try {
        const offers = await flights(parsed.data, true);
        const checkedAt = new Date().toISOString();
        const { error: insertError } = await admin.from('flight_snapshots').insert({ user_id: userId, search_id: search.id, offers, lowest_price: offers[0]?.price ?? null, checked_at: checkedAt });
        if (insertError) throw insertError;
        await admin.from('saved_searches').update({ last_checked_at: checkedAt, last_error: null }).eq('id', search.id).eq('user_id', userId);
        processed++;
      } catch (cause) {
        const message = cause instanceof TravelError ? cause.message : 'Não foi possível concluir a consulta.';
        await admin.from('saved_searches').update({ last_error: message }).eq('id', search.id).eq('user_id', userId);
        if (cause instanceof TravelError && cause.status === 429) { quotaStopped = true; break; }
      }
    }
    return NextResponse.json({ processed, attempted, quotaStopped });
  } catch { return NextResponse.json({ error: 'Não foi possível executar o monitoramento.' }, { status: 500 }); }
}
