import test from 'node:test';
import assert from 'node:assert/strict';
import { cycleStart } from '../lib/travel/quota';
import { flightSchema, saveSchema, staySchema } from '../lib/travel/schema';

test('ciclo respeita o dia contratado e meses curtos', () => {
  assert.equal(cycleStart('2026-01-31', new Date('2026-02-28T12:00:00Z')), '2026-02-28');
  assert.equal(cycleStart('2026-01-31', new Date('2026-03-01T12:00:00Z')), '2026-02-28');
  assert.equal(cycleStart('2026-01-31', new Date('2026-03-31T12:00:00Z')), '2026-03-31');
});
test('franquia não é habilitada com ciclo ausente, inválido ou futuro', () => {
  for (const value of ['', '2026-02-31', '2028-01-01']) assert.throws(() => cycleStart(value, new Date('2026-11-16T00:00:00Z')));
});
const trip = { origin: 'cgb', destination: 'gru', destinationName: 'São Paulo', departureDate: '2027-03-10', returnDate: '2027-03-20', passengers: 2, maxPrice: 2500, maxStops: 1 };
test('voos preservam rota, passageiros e filtros e recusam datas incompatíveis', () => {
  const valid = flightSchema.safeParse(trip);
  assert.equal(valid.success, true);
  if (valid.success) assert.equal(valid.data.origin, 'CGB');
  assert.equal(flightSchema.safeParse({ ...trip, returnDate: '2027-03-01' }).success, false);
  assert.equal(flightSchema.safeParse({ ...trip, destination: 'CGB' }).success, false);
  assert.equal(flightSchema.safeParse({ ...trip, passengers: 0 }).success, false);
});
test('monitoramento não termina depois da partida', () => {
  assert.equal(saveSchema.safeParse({ ...trip, monitorUntil: '2027-03-10' }).success, true);
  assert.equal(saveSchema.safeParse({ ...trip, monitorUntil: '2027-03-11' }).success, false);
});
test('hospedagem exige saída posterior à entrada', () => {
  assert.equal(staySchema.safeParse({ destination: 'São Paulo', checkin: '2027-03-10', checkout: '2027-03-10', adults: 2 }).success, false);
  assert.equal(staySchema.safeParse({ destination: 'São Paulo', checkin: '2027-03-10', checkout: '2027-03-12', adults: 2 }).success, true);
});

test('ida e volta aplica o limite de conexões em cada trecho, conforme o contrato do fornecedor', async () => {
  const { providerFlightRequest } = await import('../lib/travel/flight-contract');
  const result = providerFlightRequest({ ...trip, origin: 'CGB', destination: 'GRU' });
  assert.ok('max_departure_stops' in result);
  assert.ok('max_return_stops' in result);
  if ('max_departure_stops' in result && 'max_return_stops' in result) {
    assert.equal(result.max_departure_stops, 1);
    assert.equal(result.max_return_stops, 1);
  }
  assert.deepEqual(result.passengers, [1, 1]);
  assert.equal(result.currency, 'BRL');
});
test('links externos aceitam somente HTTPS para o domínio do fornecedor', async () => {
  const { providerLink } = await import('../lib/travel/flight-contract');
  assert.equal(providerLink('javascript:alert(1)', 'google.com'), null);
  assert.equal(providerLink('https://google.com.evil.example/travel', 'google.com'), null);
  assert.ok(providerLink('https://www.google.com/travel/flights', 'google.com'));
});
test('preserva dados de ida e volta em ofertas combinadas', async () => {
  const { normalizeFlight } = await import('../lib/travel/flight-contract');
  const offer = normalizeFlight({ total_price_as_number: 500, departure_flight_airline: 'A', departure_flight_departure_description: '10:00', departure_flight_arrival_description: '12:00', return_flight_departure_description: '15:00', return_flight_arrival_description: '17:00', return_flight_airline: 'B', return_flight_duration: '2h' });
  assert.equal(offer.price, 500);
  assert.equal(offer.departure, '10:00');
  assert.equal(offer.returnDeparture, '15:00');
  assert.equal(offer.returnAirline, 'B');
});
