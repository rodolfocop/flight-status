import test from 'node:test';
import assert from 'node:assert/strict';
import { flightDuration, flightTime, stayNightsDiffer } from '../lib/travel/presentation';
import { normalizeFlight, providerLink } from '../lib/travel/flight-contract';
import { normalizeStay } from '../lib/travel/stay-contract';

test('horários do fornecedor são apresentados em português sem mudar o horário local', () => {
  assert.equal(flightTime('2:00 AM on Tue, Aug 10', '2027-08-10'), '02:00 · 10/08/2027');
  assert.equal(flightTime('12:15 AM on Wed, Aug 18', '2027-08-17'), '00:15 · 18/08/2027');
  assert.equal(flightTime('12:05 PM on Tue, Jan 1', '2026-12-31'), '12:05 · 01/01/2027');
  assert.equal(flightDuration('13 hr 5 min'), '13 h 5 min');
});
test('ofertas guardam conexões por trecho sem inventar benefícios', () => {
  const offer = normalizeFlight({ departure_flight_airline: 'Gol', total_stops: 3, departure_flight_stops: 1, return_flight_stops: 2, departure_stops_info: [{ stop_airport: 'GRU', stop_duration_seconds: 3600 }], total_price_as_number: 1500 });
  assert.equal(offer.outboundStops, 1);
  assert.equal(offer.returnStops, 2);
  assert.deepEqual(offer.outboundLayovers, [{ airport: 'GRU', durationSeconds: 3600 }]);
});
test('fotos e detalhes de hospedagem são guardados apenas com imagem HTTPS de domínio permitido', () => {
  const stay = normalizeStay({ name: 'Casa', image_url: 'https://a0.muscache.com/pictures/foto.jpg', bedrooms: 2, beds: 3, baths: 1, price_total: 1000 });
  assert.equal(stay.imageUrl, 'https://a0.muscache.com/pictures/foto.jpg');
  assert.equal(stay.bedrooms, 2);
  assert.equal(normalizeStay({ image_url: 'https://muscache.com.evil.example/foto.jpg' }).imageUrl, null);
  assert.equal(providerLink('https://usuario:senha@www.airbnb.com/rooms/1', 'airbnb.com'), null);
});
test('noites divergentes das datas são identificadas sem alterar o preço', () => {
  assert.equal(stayNightsDiffer(7, '2027-08-10', '2027-08-17'), false);
  assert.equal(stayNightsDiffer(6, '2027-08-10', '2027-08-17'), true);
  assert.equal(stayNightsDiffer(null, '2027-08-10', '2027-08-17'), false);
});
