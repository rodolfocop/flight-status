import { NextResponse } from 'next/server';
import { owner, adminClient } from '@/lib/supabase/server';
import { flightSchema } from '@/lib/travel/schema';
import { flights } from '@/lib/travel/provider';
import { fail, validRequest } from '@/lib/travel/http';
import { localRequest } from '@/lib/local/mode';
import { dateInZone } from '@/lib/travel/time-zone';
import { requireUserTimeZone } from '@/lib/travel/user-time-zone';

export async function POST(request: Request) {
  try {
    if (!validRequest(request)) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
    const local = localRequest(request);
    const auth = local ? null : await owner();
    if (!local && !auth) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const body = await request.json();
    const parsed = flightSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Confira os dados da pesquisa.' }, { status: 400 });
    let searchId: string | undefined;
    let query = parsed.data;
    if (body.searchId) {
      const data = local ? (await import('@/lib/local/store')).getSearch(body.searchId) : (await auth!.client.from('saved_searches').select('*').eq('id', body.searchId).eq('user_id', auth!.user.id).maybeSingle()).data;
      if (!data) return NextResponse.json({ error: 'Pesquisa não encontrada.' }, { status: 404 });
      searchId = data.id;
      const saved = flightSchema.safeParse({ origin: data.origin, destination: data.destination, destinationName: data.destination_name, departureDate: data.departure_date, returnDate: data.return_date, passengers: data.passengers, maxPrice: data.max_price, maxStops: data.max_stops });
      if (!saved.success) return NextResponse.json({ error: 'Dados da pesquisa salva são inválidos.' }, { status: 400 });
      query = saved.data;
    }
    if (query.departureDate < dateInZone(new Date(), await requireUserTimeZone(local, auth))) return NextResponse.json({ error: 'A data de ida já passou no seu fuso horário.' }, { status: 400 });
    const offers = await flights(query);
    const checkedAt = new Date().toISOString();
    if (searchId) {
      if (local) (await import('@/lib/local/store')).saveFlights(searchId, offers, checkedAt);
      else if (auth) {
        const admin = adminClient();
        const { error } = await admin.from('flight_snapshots').insert({ user_id: auth.user.id, search_id: searchId, offers, lowest_price: offers[0]?.price ?? null, checked_at: checkedAt });
        if (error) throw error;
        await admin.from('saved_searches').update({ last_checked_at: checkedAt, last_error: null }).eq('id', searchId).eq('user_id', auth.user.id);
      }
    } else if (local) {
      searchId = (await import('@/lib/local/store')).saveManualFlightResult(query, offers, checkedAt);
    }
    return NextResponse.json({ offers, checkedAt, searchId });
  } catch (error) { return fail(error); }
}
