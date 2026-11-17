import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { localRequest } from '@/lib/local/mode';
import { flights, TravelError } from '@/lib/travel/provider';
import { flightSchema } from '@/lib/travel/schema';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const expected = process.env.LOCAL_MONITOR_SECRET;
  const provided = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!localRequest(request) || !expected || !provided || Buffer.byteLength(expected) !== Buffer.byteLength(provided) || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const settings = (await import('@/lib/local/settings')).loadSettings();
  if (!(settings.rapidApiKey || process.env.RAPIDAPI_KEY) || !(settings.flightsCycle || process.env.RAPIDAPI_FLIGHTS_CYCLE_ANCHOR)) return NextResponse.json({ attempted: 0, configured: false });
  const store = await import('@/lib/local/store');
  if (!store.getTimeZone()) return NextResponse.json({ attempted: 0, configured: false, reason: 'timezone' });
  let attempted = 0;
  for (const search of store.dueSearches(new Date())) {
    const id = String(search.id);
    if (!store.claimSearch(id, new Date())) continue;
    attempted++;
    const parsed = flightSchema.safeParse({ origin: search.origin, destination: search.destination, destinationName: search.destination_name, departureDate: search.departure_date, returnDate: search.return_date, passengers: search.passengers, maxPrice: search.max_price, maxStops: search.max_stops });
    if (!parsed.success) { store.recordError(id, 'Dados da pesquisa são inválidos.'); continue; }
    try { store.saveFlights(id, await flights(parsed.data, true), new Date().toISOString()); }
    catch (error) {
      store.recordError(id, error instanceof TravelError ? error.message : 'Não foi possível atualizar a pesquisa.');
      if (error instanceof TravelError && error.status === 429) break;
    }
  }
  return NextResponse.json({ attempted, configured: true });
}
