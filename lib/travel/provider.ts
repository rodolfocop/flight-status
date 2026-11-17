import 'server-only';
import { adminClient } from '@/lib/supabase/server';
import { cycleStart } from './quota';
import { normalizeFlight, providerFlightRequest } from './flight-contract';
import { normalizeStay } from './stay-contract';
import type { FlightOffer, FlightQuery, StayOffer, StayQuery } from './schema';

type Raw = Record<string, unknown>;
const str = (v: unknown, fallback = '') => typeof v === 'string' ? v : fallback;
export class TravelError extends Error { constructor(message: string, public status = 502) { super(message); } }
async function reserve(provider: 'flights' | 'stays', automatic: boolean) {
  const localSettings = process.env.DESTINO_LOCAL === '1' ? (await import('@/lib/local/settings')).loadSettings() : null;
  const anchor = provider === 'flights' ? (localSettings?.flightsCycle || process.env.RAPIDAPI_FLIGHTS_CYCLE_ANCHOR) : (localSettings?.staysCycle || process.env.RAPIDAPI_STAYS_CYCLE_ANCHOR);
  const key = localSettings?.rapidApiKey || process.env.RAPIDAPI_KEY;
  if (!anchor || !key) throw new TravelError('Serviço de viagens ainda não configurado.', 503);
  let start: string;
  try { start = cycleStart(anchor); } catch { throw new TravelError('Configure corretamente o ciclo da franquia.', 503); }
  if (process.env.DESTINO_LOCAL === '1') {
    const { reserveQuota } = await import('@/lib/local/store');
    if (reserveQuota(provider, automatic) === -1) throw new TravelError(automatic ? 'Monitoramento pausado para preservar consultas manuais.' : 'Franquia esgotada. Confirme a próxima renovação na RapidAPI.', 429);
    return key;
  }
  const admin = adminClient();
  const { error: guardError } = await admin.rpc('quota_guard_status', { p_provider: provider });
  if (guardError) throw new TravelError('Controle seguro da franquia não configurado. Nenhuma consulta foi realizada.', 503);
  const { data, error } = await admin.rpc('reserve_api_request', { p_provider: provider, p_cycle_start: start, p_automatic: automatic });
  if (error) throw new TravelError('Não foi possível verificar a franquia. Nenhuma consulta foi realizada.', 503);
  if (data === -1) throw new TravelError(automatic ? 'Monitoramento pausado para preservar consultas manuais.' : 'Franquia de consultas esgotada neste ciclo.', 429);
  return key;
}
async function request(host: string, path: string, payload: object, key: string) {
  const response = await fetch(`https://${host}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-rapidapi-host': host, 'x-rapidapi-key': key },
    body: JSON.stringify(payload), cache: 'no-store', signal: AbortSignal.timeout(75000),
  });
  if (!response.ok) throw new TravelError(response.status === 429 ? 'Limite do fornecedor atingido.' : 'O fornecedor não conseguiu concluir a pesquisa.', response.status === 429 ? 429 : 502);
  const status = response.headers.get('x-search-status');
  if (status && !['ok', 'empty'].includes(status)) throw new TravelError('A pesquisa no fornecedor ficou incompleta. Tente novamente mais tarde.');
  return response.json() as Promise<unknown>;
}
export async function flights(q: FlightQuery, automatic = false): Promise<FlightOffer[]> {
  const key = await reserve('flights', automatic);
  const host = 'google-flights-live-api.p.rapidapi.com';
  const result = await request(host, q.returnDate ? '/api/google_flights/roundtrip/v1' : '/api/google_flights/oneway/v1', providerFlightRequest(q), key);
  if (!Array.isArray(result)) throw new TravelError('Resposta inesperada do fornecedor de voos.');
  return (result as Raw[]).map(normalizeFlight).sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
}
export async function stays(q: StayQuery): Promise<StayOffer[]> {
  const key = await reserve('stays', false);
  const result = await request('airbnb-live-api.p.rapidapi.com', '/search', { destination: q.destination, checkin_date: q.checkin, checkout_date: q.checkout, adults: q.adults, currency: 'BRL' }, key);
  if (!result || typeof result !== 'object') throw new TravelError('Resposta inesperada do fornecedor de hospedagens.');
  const data = result as Raw;
  if (!['ok', 'empty'].includes(str(data.search_status)) || !Array.isArray(data.properties)) throw new TravelError('A pesquisa de hospedagens ficou incompleta.');
  return (data.properties as Raw[]).map(normalizeStay);
}
