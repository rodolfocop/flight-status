import { NextResponse } from 'next/server';
import { owner } from '@/lib/supabase/server';
import { saveSchema } from '@/lib/travel/schema';
import { fail, validRequest } from '@/lib/travel/http';
import { localRequest } from '@/lib/local/mode';
import { dateInZone } from '@/lib/travel/time-zone';
import { requireUserTimeZone } from '@/lib/travel/user-time-zone';
export async function GET(request: Request) {
  try {
    if (localRequest(request)) {
      const { listSearches } = await import('@/lib/local/store');
      return NextResponse.json({ searches: listSearches() });
    }
    const auth = await owner();
    if (!auth) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const { data, error } = await auth.client.from('saved_searches').select('*, flight_snapshots(id, checked_at, lowest_price, currency, offers)').order('created_at', { ascending: false }).order('checked_at', { referencedTable: 'flight_snapshots', ascending: false }).limit(30, { referencedTable: 'flight_snapshots' });
    if (error) throw error;
    return NextResponse.json({ searches: data });
  } catch (error) { return fail(error); }
}
export async function POST(request: Request) {
  try {
    if (!validRequest(request)) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
    const local = localRequest(request);
    const auth = local ? null : await owner();
    if (!local && !auth) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const p = saveSchema.safeParse(await request.json());
    if (!p.success) return NextResponse.json({ error: 'Confira os dados e a data final do acompanhamento.' }, { status: 400 });
    const q = p.data;
    if (q.monitorUntil < dateInZone(new Date(), await requireUserTimeZone(local, auth))) return NextResponse.json({ error: 'A data final do acompanhamento já passou no seu fuso horário.' }, { status: 400 });
    if (local) {
      const { saveSearch } = await import('@/lib/local/store');
      return NextResponse.json({ search: saveSearch(q) }, { status: 201 });
    }
    if (!auth) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const { data, error } = await auth.client.from('saved_searches').insert({ user_id: auth.user.id, origin: q.origin, destination: q.destination, destination_name: q.destinationName, departure_date: q.departureDate, return_date: q.returnDate || null, passengers: q.passengers, max_price: q.maxPrice ?? null, max_stops: q.maxStops ?? null, monitor_until: q.monitorUntil }).select().single();
    if (error) throw error;
    return NextResponse.json({ search: data }, { status: 201 });
  } catch (error) { return fail(error); }
}
