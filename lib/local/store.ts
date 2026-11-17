import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FlightOffer, FlightQuery, StayOffer, StayQuery } from '../travel/schema';
import { dueOnLocalDay, validTimeZone } from '../travel/time-zone';

type Row = Record<string, string | number | null>;
const directory = process.env.DESTINO_DATA_DIR || join(process.cwd(), '.destino-certo');
let database: DatabaseSync | undefined;
export function closeLocalStore() { database?.close(); database = undefined; }
function db() {
  if (database) return database;
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, 'destino-certo.sqlite');
  const result = new DatabaseSync(path, { timeout: 5000 });
  chmodSync(path, 0o600);
  result.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS saved_searches (
      id TEXT PRIMARY KEY, origin TEXT NOT NULL, destination TEXT NOT NULL, destination_name TEXT NOT NULL,
      departure_date TEXT NOT NULL, return_date TEXT, passengers INTEGER NOT NULL,
      max_price REAL, max_stops INTEGER, monitor_until TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
      last_attempt_at TEXT, last_checked_at TEXT, last_error TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS flight_snapshots (
      id TEXT PRIMARY KEY, search_id TEXT NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
      checked_at TEXT NOT NULL, offers TEXT NOT NULL, lowest_price REAL, currency TEXT NOT NULL DEFAULT 'BRL'
    );
    CREATE INDEX IF NOT EXISTS flight_snapshots_search_date ON flight_snapshots(search_id,checked_at DESC);
    CREATE TABLE IF NOT EXISTS stay_snapshots (id TEXT PRIMARY KEY, query_key TEXT NOT NULL, checked_at TEXT NOT NULL, offers TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS stay_snapshots_key_date ON stay_snapshots(query_key,checked_at DESC);
    CREATE TABLE IF NOT EXISTS stay_trip_links (search_id TEXT NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE, snapshot_id TEXT NOT NULL REFERENCES stay_snapshots(id) ON DELETE CASCADE, PRIMARY KEY(search_id,snapshot_id));
    CREATE TABLE IF NOT EXISTS api_quota (provider TEXT NOT NULL, cycle_start TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(provider,cycle_start));
    CREATE TABLE IF NOT EXISTS quota_guard (provider TEXT PRIMARY KEY, used INTEGER NOT NULL DEFAULT 0, next_reset_at TEXT);
    CREATE TABLE IF NOT EXISTS user_preferences (id INTEGER PRIMARY KEY CHECK(id = 1), time_zone TEXT NOT NULL);
  `);
  database = result;
  return result;
}
const decodeSearch = (row: Row): Record<string, string | number | boolean | null> & { id: string; active: boolean } => ({ ...row, id: String(row.id), active: row.active === 1 });
export function listSearches() {
  const connection = db();
  return (connection.prepare('SELECT * FROM saved_searches ORDER BY created_at DESC').all() as Row[]).map(row => ({
    ...decodeSearch(row),
    flight_snapshots: (connection.prepare('SELECT id,checked_at,lowest_price,currency,offers FROM flight_snapshots WHERE search_id = ? ORDER BY checked_at DESC, rowid DESC').all(row.id as string) as Row[]).map(s => ({ ...s, offers: JSON.parse(s.offers as string) })),
  }));
}
export function getSearch(id: string) {
  const row = db().prepare('SELECT * FROM saved_searches WHERE id = ?').get(id) as Row | undefined;
  return row ? decodeSearch(row) : null;
}
export function saveSearch(q: FlightQuery & { monitorUntil: string }) {
  const connection = db();
  const existing = matchingSearch(q);
  const id = existing?.id || randomUUID();
  if (existing) connection.prepare('UPDATE saved_searches SET active = 1, monitor_until = ? WHERE id = ?').run(q.monitorUntil, id);
  else connection.prepare('INSERT INTO saved_searches(id,origin,destination,destination_name,departure_date,return_date,passengers,max_price,max_stops,monitor_until,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id, q.origin, q.destination, q.destinationName, q.departureDate, q.returnDate ?? null, q.passengers, q.maxPrice ?? null, q.maxStops ?? null, q.monitorUntil, new Date().toISOString());
  return getSearch(id);
}
function matchingSearch(q: FlightQuery) {
  return db().prepare('SELECT id FROM saved_searches WHERE origin = ? AND destination = ? AND destination_name = ? AND departure_date = ? AND return_date IS ? AND passengers = ? AND max_price IS ? AND max_stops IS ? ORDER BY created_at DESC, rowid DESC LIMIT 1').get(q.origin, q.destination, q.destinationName, q.departureDate, q.returnDate ?? null, q.passengers, q.maxPrice ?? null, q.maxStops ?? null) as { id: string } | undefined;
}
export function saveManualFlightResult(q: FlightQuery, offers: FlightOffer[], checkedAt: string) {
  const connection = db();
  connection.exec('BEGIN IMMEDIATE');
  try {
    let id = matchingSearch(q)?.id;
    if (!id) {
      id = randomUUID();
      connection.prepare('INSERT INTO saved_searches(id,origin,destination,destination_name,departure_date,return_date,passengers,max_price,max_stops,monitor_until,active,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,0,?)').run(id, q.origin, q.destination, q.destinationName, q.departureDate, q.returnDate ?? null, q.passengers, q.maxPrice ?? null, q.maxStops ?? null, q.departureDate, checkedAt);
    }
    connection.prepare('INSERT INTO flight_snapshots(id,search_id,checked_at,offers,lowest_price,currency) VALUES(?,?,?,?,?,?)').run(randomUUID(), id, checkedAt, JSON.stringify(offers), offers[0]?.price ?? null, 'BRL');
    connection.prepare('UPDATE saved_searches SET last_checked_at = ?, last_error = NULL WHERE id = ?').run(checkedAt, id);
    connection.exec('COMMIT');
    return id;
  } catch (error) { connection.exec('ROLLBACK'); throw error; }
}
export function setActive(id: string, active: boolean) {
  return db().prepare('UPDATE saved_searches SET active = ? WHERE id = ?').run(active ? 1 : 0, id).changes > 0;
}
export function saveFlights(id: string, offers: FlightOffer[], checkedAt: string) {
  const connection = db();
  connection.exec('BEGIN IMMEDIATE');
  try {
    connection.prepare('INSERT INTO flight_snapshots(id,search_id,checked_at,offers,lowest_price,currency) VALUES(?,?,?,?,?,?)').run(randomUUID(), id, checkedAt, JSON.stringify(offers), offers[0]?.price ?? null, 'BRL');
    connection.prepare('UPDATE saved_searches SET last_checked_at = ?, last_error = NULL WHERE id = ?').run(checkedAt, id);
    connection.exec('COMMIT');
  } catch (error) { connection.exec('ROLLBACK'); throw error; }
}
export function saveStays(query: string, offers: StayOffer[], checkedAt: string, searchId?: string) {
  const connection = db();
  const id = randomUUID();
  connection.exec('BEGIN IMMEDIATE');
  try {
    connection.prepare('INSERT INTO stay_snapshots(id,query_key,checked_at,offers) VALUES(?,?,?,?)').run(id, query, checkedAt, JSON.stringify(offers));
    if (searchId) connection.prepare('INSERT INTO stay_trip_links(search_id,snapshot_id) VALUES(?,?)').run(searchId, id);
    connection.exec('COMMIT');
  } catch (error) { connection.exec('ROLLBACK'); throw error; }
}
export function latestStays(query: string) {
  const row = db().prepare('SELECT offers,checked_at FROM stay_snapshots WHERE query_key = ? ORDER BY checked_at DESC LIMIT 1').get(query) as Row | undefined;
  return row ? { offers: JSON.parse(row.offers as string) as StayOffer[], checkedAt: row.checked_at as string } : null;
}
export function listStays(query: string) {
  return (db().prepare('SELECT id,offers,checked_at FROM stay_snapshots WHERE query_key = ? ORDER BY checked_at DESC, rowid DESC').all(query) as Row[]).map(row => ({ id: row.id as string, offers: JSON.parse(row.offers as string) as StayOffer[], checkedAt: row.checked_at as string }));
}
export function listStayHistory() {
  return (db().prepare('SELECT id,query_key,offers,checked_at FROM stay_snapshots ORDER BY checked_at DESC, rowid DESC').all() as Row[]).map(row => ({ id: row.id as string, query: JSON.parse(row.query_key as string) as StayQuery, offers: JSON.parse(row.offers as string) as StayOffer[], checkedAt: row.checked_at as string }));
}
export function listTripStays(searchId: string, queryKey: string | null) {
  return (db().prepare('SELECT s.id,s.query_key,s.offers,s.checked_at FROM stay_snapshots s WHERE (s.query_key = ? OR EXISTS (SELECT 1 FROM stay_trip_links l WHERE l.snapshot_id = s.id AND l.search_id = ?)) ORDER BY s.checked_at DESC, s.rowid DESC').all(queryKey, searchId) as Row[]).map(row => ({ id: row.id as string, query: JSON.parse(row.query_key as string) as StayQuery, offers: JSON.parse(row.offers as string) as StayOffer[], checkedAt: row.checked_at as string }));
}
function guardRow(connection: DatabaseSync, provider: 'flights' | 'stays', now: Date) {
  connection.prepare('INSERT OR IGNORE INTO quota_guard(provider,used) SELECT ?, COALESCE(SUM(used),0) FROM api_quota WHERE provider = ?').run(provider, provider);
  const row = connection.prepare('SELECT used,next_reset_at FROM quota_guard WHERE provider = ?').get(provider) as Row;
  if (row.next_reset_at && new Date(String(row.next_reset_at)).getTime() <= now.getTime()) {
    connection.prepare('UPDATE quota_guard SET used = 0, next_reset_at = NULL WHERE provider = ?').run(provider);
    return { used: 0, nextResetAt: null as string | null };
  }
  return { used: Number(row.used), nextResetAt: row.next_reset_at == null ? null : String(row.next_reset_at) };
}
export function reserveQuota(provider: 'flights' | 'stays', automatic: boolean, now = new Date()) {
  const connection = db();
  const limit = provider === 'stays' ? 100 : automatic ? 40 : 50;
  connection.exec('BEGIN IMMEDIATE');
  try {
    const row = guardRow(connection, provider, now);
    if (row.used >= limit) { connection.exec('COMMIT'); return -1; }
    connection.prepare('UPDATE quota_guard SET used = used + 1 WHERE provider = ?').run(provider);
    connection.exec('COMMIT');
    return row.used + 1;
  } catch (error) { connection.exec('ROLLBACK'); throw error; }
}
export function quotaStatus(provider: 'flights' | 'stays', now = new Date()) {
  const connection = db();
  connection.exec('BEGIN IMMEDIATE');
  try { const result = guardRow(connection, provider, now); connection.exec('COMMIT'); return result; }
  catch (error) { connection.exec('ROLLBACK'); throw error; }
}
export function setQuotaReset(provider: 'flights' | 'stays', resetAt: string | null, now = new Date()) {
  if (resetAt != null && (!Number.isFinite(Date.parse(resetAt)) || Date.parse(resetAt) <= now.getTime())) throw new Error('Informe um horário de renovação futuro.');
  const connection = db();
  connection.exec('BEGIN IMMEDIATE');
  try {
    guardRow(connection, provider, now);
    connection.prepare('UPDATE quota_guard SET next_reset_at = ? WHERE provider = ?').run(resetAt, provider);
    connection.exec('COMMIT');
  } catch (error) { connection.exec('ROLLBACK'); throw error; }
}
export function getTimeZone() {
  const row = db().prepare('SELECT time_zone FROM user_preferences WHERE id = 1').get() as Row | undefined;
  return validTimeZone(row?.time_zone) ? row.time_zone : null;
}
export function saveTimeZone(timeZone: string, onlyIfMissing = false) {
  if (!validTimeZone(timeZone)) throw new Error('Fuso horário inválido.');
  if (onlyIfMissing) db().prepare('INSERT OR IGNORE INTO user_preferences(id,time_zone) VALUES(1,?)').run(timeZone);
  else db().prepare('INSERT INTO user_preferences(id,time_zone) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET time_zone=excluded.time_zone').run(timeZone);
  return getTimeZone();
}
export function dueSearches(now: Date) {
  const zone = getTimeZone();
  if (!zone) return [];
  return (db().prepare('SELECT * FROM saved_searches WHERE active = 1 ORDER BY last_attempt_at ASC').all() as Row[]).map(decodeSearch).filter(row => dueOnLocalDay({ active: row.active, monitor_until: String(row.monitor_until), departure_date: String(row.departure_date), last_attempt_at: row.last_attempt_at == null ? null : String(row.last_attempt_at) }, now, zone)).slice(0, 3);
}
export function claimSearch(id: string, now: Date) {
  const connection = db();
  connection.exec('BEGIN IMMEDIATE');
  try {
    const zone = getTimeZone();
    const row = getSearch(id);
    if (!zone || !row || !dueOnLocalDay({ active: row.active, monitor_until: String(row.monitor_until), departure_date: String(row.departure_date), last_attempt_at: row.last_attempt_at == null ? null : String(row.last_attempt_at) }, now, zone)) { connection.exec('COMMIT'); return false; }
    const claimed = connection.prepare('UPDATE saved_searches SET last_attempt_at = ? WHERE id = ?').run(now.toISOString(), id).changes > 0;
    connection.exec('COMMIT'); return claimed;
  } catch (error) { connection.exec('ROLLBACK'); throw error; }
}
export function recordError(id: string, message: string) {
  db().prepare('UPDATE saved_searches SET last_error = ? WHERE id = ?').run(message, id);
}
