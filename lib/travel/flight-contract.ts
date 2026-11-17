import type { FlightOffer, FlightQuery, Layover } from './schema';
type Raw = Record<string, unknown>;
const str = (v: unknown, fallback = '') => typeof v === 'string' ? v : fallback;
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
export function providerFlightRequest(q: FlightQuery) {
  return {
    from_airport: q.origin, to_airport: q.destination, departure_date: q.departureDate,
    ...(q.returnDate ? { return_date: q.returnDate } : {}), passengers: Array(q.passengers).fill(1),
    currency: 'BRL', limit: 20, strict: true,
    ...(q.maxPrice ? { max_price: q.maxPrice } : {}),
    ...(q.maxStops != null ? (q.returnDate ? { max_departure_stops: q.maxStops, max_return_stops: q.maxStops } : { max_stops: q.maxStops }) : {}),
  };
}
export function providerLink(value: unknown, suffix: string): string | null {
  if (typeof value !== 'string') return null;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.port && (u.hostname === suffix || u.hostname.endsWith(`.${suffix}`)) ? u.toString() : null; } catch { return null; }
}
export function normalizeFlight(x: Raw): FlightOffer {
  const layovers = (value: unknown): Layover[] | undefined => Array.isArray(value) ? value.filter((entry): entry is Raw => !!entry && typeof entry === 'object').map(entry => ({ airport: str(entry.stop_airport, 'Aeroporto não informado'), durationSeconds: num(entry.stop_duration_seconds) })) : undefined;
  return {
    airline: str(x.airline ?? x.departure_flight_airline, 'Companhia não informada'), price: num(x.total_price_as_number ?? x.price_as_number), currency: 'BRL',
    duration: str(x.duration ?? x.departure_flight_duration, 'Duração no fornecedor'), stops: num(x.total_stops ?? x.stops),
    departure: str(x.departure_description ?? x.departure_flight_departure_description, 'Horário no fornecedor'), arrival: str(x.arrival_description ?? x.departure_flight_arrival_description, 'Horário no fornecedor'),
    ...(typeof x.return_flight_departure_description === 'string' ? { returnDeparture: x.return_flight_departure_description } : {}),
    ...(typeof x.return_flight_arrival_description === 'string' ? { returnArrival: x.return_flight_arrival_description } : {}),
    ...(typeof x.return_flight_airline === 'string' ? { returnAirline: x.return_flight_airline } : {}),
    ...(typeof x.return_flight_duration === 'string' ? { returnDuration: x.return_flight_duration } : {}),
    outboundStops: num(x.departure_flight_stops ?? x.stops), returnStops: num(x.return_flight_stops),
    outboundLayovers: layovers(x.departure_stops_info ?? x.stops_info), returnLayovers: layovers(x.return_stops_info),
    link: providerLink(x.buy_link, 'google.com'),
  };
}
