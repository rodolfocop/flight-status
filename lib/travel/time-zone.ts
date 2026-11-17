/** Calendário civil do usuário; instantes continuam armazenados em UTC. */
export function validTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 100 || !/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)*$/.test(value)) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0); return true; } catch { return false; }
}

export function dateInZone(now: Date, timeZone: string): string {
  if (!validTimeZone(timeZone) || !Number.isFinite(now.getTime())) throw new Error('Fuso horário inválido.');
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function dueOnLocalDay(search: { active: boolean; monitor_until: string; departure_date: string; last_attempt_at: string | null }, now: Date, timeZone: string): boolean {
  if (!search.active || !validTimeZone(timeZone)) return false;
  const today = dateInZone(now, timeZone);
  if (search.monitor_until < today || search.departure_date < today) return false;
  if (!search.last_attempt_at) return true;
  const last = new Date(search.last_attempt_at);
  if (!Number.isFinite(last.getTime()) || last > now) return false;
  return dateInZone(last, timeZone) < today && now.getTime() - last.getTime() >= 20 * 60 * 60 * 1000;
}
