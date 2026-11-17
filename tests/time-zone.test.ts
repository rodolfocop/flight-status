import test from 'node:test';
import assert from 'node:assert/strict';
import { dateInZone, dueOnLocalDay, validTimeZone } from '../lib/travel/time-zone';

test('a data civil depende do fuso e funciona ao atravessar dia, mês e ano', () => {
  const instant = new Date('2027-01-01T03:00:00Z');
  assert.equal(dateInZone(instant, 'America/Cuiaba'), '2026-12-31');
  assert.equal(dateInZone(instant, 'Asia/Tokyo'), '2027-01-01');
  assert.equal(dateInZone(new Date('2026-12-31T10:30:00Z'), 'Pacific/Kiritimati'), '2027-01-01');
  assert.equal(validTimeZone('America/Cuiaba'), true);
  assert.equal(validTimeZone('America/Inventada'), false);
  assert.equal(validTimeZone('GMT+3'), false);
});

test('monitora até o fim do dia local e não repete no mesmo dia civil', () => {
  const trip = { active: true, departure_date: '2026-11-17', monitor_until: '2026-11-17', last_attempt_at: null as string | null };
  assert.equal(dueOnLocalDay(trip, new Date('2026-11-18T03:59:00Z'), 'America/Cuiaba'), true);
  assert.equal(dueOnLocalDay(trip, new Date('2026-11-18T04:00:00Z'), 'America/Cuiaba'), false);
  trip.last_attempt_at = '2026-11-17T04:01:00Z';
  assert.equal(dueOnLocalDay(trip, new Date('2026-11-18T03:59:00Z'), 'America/Cuiaba'), false);
  assert.equal(dueOnLocalDay({ ...trip, monitor_until: '2026-11-18', departure_date: '2026-11-18' }, new Date('2026-11-18T04:00:00Z'), 'America/Cuiaba'), true);
  assert.equal(dueOnLocalDay(trip, new Date('2026-11-18T03:59:00Z'), 'Invalid/Zone'), false);
});

test('horário de verão respeita o calendário local e o intervalo mínimo', () => {
  const trip = { active: true, departure_date: '2027-03-15', monitor_until: '2027-03-15', last_attempt_at: '2027-03-13T14:00:00Z' };
  assert.equal(dateInZone(new Date('2027-03-14T06:59:00Z'), 'America/New_York'), '2027-03-14');
  assert.equal(dateInZone(new Date('2027-03-14T07:00:00Z'), 'America/New_York'), '2027-03-14');
  assert.equal(dueOnLocalDay(trip, new Date('2027-03-14T09:59:00Z'), 'America/New_York'), false);
  assert.equal(dueOnLocalDay(trip, new Date('2027-03-14T10:00:00Z'), 'America/New_York'), true);
});
