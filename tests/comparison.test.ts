import test from 'node:test';
import assert from 'node:assert/strict';
import { lowestPrice, matchingPrices, priceChange, sameStayPeriod } from '../lib/travel/comparison';

type Offer = { link: string | null; currency: string; price: number | null };
const amount = (offer: Offer) => offer.price;
const offer = (link: string | null, price: number | null, currency = 'BRL'): Offer => ({ link, price, currency });

test('compara mínimos reais e evita misturar moedas ou preços ausentes', () => {
  const old = lowestPrice([offer('a', 150), offer('b', 100), offer('c', null)], amount);
  const current = lowestPrice([offer('b', 120), offer('a', 180)], amount);
  assert.deepEqual(old, { amount: 100, currency: 'BRL' });
  assert.equal(priceChange(old, current), 20);
  assert.equal(lowestPrice([offer('a', 100), offer('b', 10, 'USD')], amount), null);
  assert.equal(lowestPrice([offer('a', 100), offer('b', 10, '')], amount), null);
  assert.equal(lowestPrice([offer('a', null)], amount), null);
  assert.equal(priceChange(old, { amount: 5, currency: 'USD' }), null);
});

test('só compara ofertas de mesmo link quando a identidade e a moeda são inequívocas', () => {
  const old = [offer('a', 100), offer('b', 200), offer('c', 300), offer('d', 400), offer('dup', 10), offer('dup', 20), offer(null, 50)];
  const current = [offer('a', 100), offer('b', 220), offer('c', 250), offer('d', 400, 'USD'), offer('dup', 10), offer(null, 50)];
  assert.deepEqual(matchingPrices(old, current, amount), { same: 1, increased: 1, decreased: 1, total: 3 });
});

test('não compara estadias com datas ou passageiros diferentes ou desconhecidos', () => {
  const query = { destination: 'Natal', checkin: '2027-08-10', checkout: '2027-08-17', adults: 1 };
  assert.equal(sameStayPeriod(query, { ...query, destination: 'Natal, Brasil' }), true);
  assert.equal(sameStayPeriod(query, { ...query, checkout: '2027-08-18' }), false);
  assert.equal(sameStayPeriod(query, { ...query, adults: 2 }), false);
  assert.equal(sameStayPeriod(query, undefined), false);
});
