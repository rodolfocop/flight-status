import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const temporary = mkdtempSync(join(tmpdir(), 'destino-test-'));
process.env.DESTINO_DATA_DIR = temporary;
after(async () => { (await import('../lib/local/store')).closeLocalStore(); rmSync(temporary, { recursive: true, force: true }); });

test('pesquisas locais persistem e podem ser pausadas', async () => {
  const store = await import('../lib/local/store');
  const search = store.saveSearch({ origin: 'CGB', destination: 'GRU', destinationName: 'São Paulo', departureDate: '2027-03-10', returnDate: '2027-03-20', passengers: 1, monitorUntil: '2027-03-01' });
  assert.ok(search);
  const id = String(search.id);
  assert.equal(store.listSearches().length, 1);
  assert.equal(store.setActive(id, false), true);
  assert.equal(store.getSearch(id)?.active, false);
});
test('buscas manuais guardam todas as ofertas e o histórico sem iniciar monitoramento', async () => {
  const store = await import('../lib/local/store');
  const query = { origin: 'CGB', destination: 'NAT', destinationName: 'Natal', departureDate: '2027-08-10', returnDate: '2027-08-17', passengers: 1 };
  const offers = [100, 200, 300].map(price => ({ airline: 'Teste', price, currency: 'BRL', duration: '', stops: 0, departure: '', arrival: '', link: null }));
  const id = store.saveManualFlightResult(query, offers, '2026-11-16T12:00:00.000Z');
  assert.equal(store.getSearch(id)?.active, false);
  store.saveManualFlightResult(query, offers.slice(0, 2), '2026-11-16T13:00:00.000Z');
  const history = store.listSearches().find(search => search.id === id)?.flight_snapshots;
  assert.deepEqual(history?.map(snapshot => snapshot.offers.length), [2, 3]);
  const monitored = store.saveSearch({ ...query, monitorUntil: '2027-08-01' });
  assert.equal(monitored?.id, id);
  assert.equal(monitored?.active, true);
});
test('histórico de hospedagens mantém resultados e datas separados por pesquisa', async () => {
  const store = await import('../lib/local/store');
  const key = JSON.stringify({ destination: 'Natal', checkin: '2027-08-10', checkout: '2027-08-17', adults: 1 });
  const offer = { name: 'Estadia de teste', total: 100, nightly: 20, currency: 'BRL', rating: null, reviews: null, nights: 5, link: null };
  store.saveStays(key, [offer, offer], '2026-11-16T12:00:00.000Z');
  store.saveStays(key, [offer], '2026-11-16T13:00:00.000Z');
  const history = store.listStays(key);
  assert.deepEqual(history.map(row => row.offers.length), [1, 2]);
  assert.equal(store.listStays('outra pesquisa').length, 0);
  const oneWay = store.saveManualFlightResult({ origin: 'CGB', destination: 'NAT', destinationName: 'Natal', departureDate: '2027-08-10', returnDate: null, passengers: 1 }, [], '2026-11-16T14:00:00.000Z');
  store.saveStays(key, [offer], '2026-11-16T15:00:00.000Z', oneWay);
  assert.equal(store.listTripStays(oneWay, null).length, 1);
  assert.equal(store.listTripStays(oneWay, key).length, 3);
  store.closeLocalStore();
  assert.equal(store.listTripStays(oneWay, null)[0].query.checkout, '2027-08-17');
});
test('franquia local reserva dez consultas manuais após 40 automáticas', async () => {
  const store = await import('../lib/local/store');
  const first = new Date('2026-11-16T12:00:00Z');
  for (let i = 0; i < 40; i++) assert.equal(store.reserveQuota('flights', true, first), i + 1);
  assert.equal(store.reserveQuota('flights', true, first), -1);
  for (let i = 0; i < 10; i++) assert.equal(store.reserveQuota('flights', false, first), 41 + i);
  assert.equal(store.reserveQuota('flights', false, first), -1);
  assert.equal(store.reserveQuota('flights', false, new Date('2026-12-16T00:00:00Z')), -1);
  store.setQuotaReset('flights', '2026-12-16T03:20:00.000Z', first);
  assert.equal(store.reserveQuota('flights', false, new Date('2026-12-16T03:19:59Z')), -1);
  assert.equal(store.reserveQuota('flights', false, new Date('2026-12-16T03:20:00Z')), 1);
  assert.deepEqual(store.quotaStatus('flights', new Date('2027-02-01T00:00:00Z')), { used: 1, nextResetAt: null });
  assert.throws(() => store.setQuotaReset('flights', '2026-12-15T00:00:00Z', new Date('2027-01-01T00:00:00Z')));
});
test('histórico anterior da franquia é incorporado sem reinício por calendário', async () => {
  const store = await import('../lib/local/store');
  const connection = new DatabaseSync(join(temporary, 'destino-certo.sqlite'));
  connection.prepare('INSERT INTO api_quota(provider,cycle_start,used) VALUES(?,?,?)').run('stays', '2026-10-16', 3);
  connection.prepare('INSERT INTO api_quota(provider,cycle_start,used) VALUES(?,?,?)').run('stays', '2026-11-16', 2);
  connection.close();
  assert.deepEqual(store.quotaStatus('stays', new Date('2026-12-16T00:00:00Z')), { used: 5, nextResetAt: null });
  assert.equal(store.reserveQuota('stays', false, new Date('2027-01-16T00:00:00Z')), 6);
});
test('configurações não expõem chaves e não reutilizam chave de IA ao trocar provedor', async () => {
  const settings = await import('../lib/local/settings');
  settings.saveSettings({ rapidApiKey: 'chave-de-teste', aiProvider: 'anthropic', aiApiKey: 'segredo-de-teste' });
  assert.equal(settings.publicSettings().rapidApiKeyConfigured, true);
  assert.equal(JSON.stringify(settings.publicSettings()).includes('segredo-de-teste'), false);
  settings.saveSettings({ aiProvider: 'gemini', aiApiKey: '' });
  assert.equal(settings.publicSettings().aiApiKeyConfigured, false);
  settings.saveSettings({ clearRapidApiKey: true });
  assert.equal(settings.publicSettings().rapidApiKeyConfigured, false);
});

test('monitor local exige fuso, reivindica uma vez por dia local e preserva histórico', async () => {
  const store = await import('../lib/local/store');
  const search = store.saveSearch({ origin: 'GRU', destination: 'NAT', destinationName: 'Natal', departureDate: '2026-11-17', returnDate: null, passengers: 1, monitorUntil: '2026-11-17' });
  const id = String(search?.id);
  assert.equal(store.getTimeZone(), null);
  assert.deepEqual(store.dueSearches(new Date('2026-11-17T01:00:00Z')), []);
  assert.equal(store.claimSearch(id, new Date('2026-11-17T01:00:00Z')), false);
  store.saveTimeZone('America/Cuiaba', true);
  store.saveTimeZone('Asia/Tokyo', true);
  assert.equal(store.getTimeZone(), 'America/Cuiaba');
  assert.equal(store.claimSearch(id, new Date('2026-11-17T01:00:00Z')), true);
  assert.equal(store.claimSearch(id, new Date('2026-11-17T23:00:00Z')), true);
  assert.equal(store.claimSearch(id, new Date('2026-11-18T03:59:00Z')), false);
  assert.equal(store.claimSearch(id, new Date('2026-11-18T04:00:00Z')), false);
  assert.equal(store.listSearches().find(item => item.id === id)?.flight_snapshots.length, 0);
});
