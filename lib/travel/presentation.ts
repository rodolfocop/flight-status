const months: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
export function flightTime(value: string, referenceDate: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)\s+on\s+\w+,?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/i);
  if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) return value;
  const month = months[match[4][0].toUpperCase() + match[4].slice(1).toLowerCase()];
  const baseMonth = Number(referenceDate.slice(5, 7));
  const year = Number(referenceDate.slice(0, 4)) + (baseMonth === 12 && month === 1 ? 1 : baseMonth === 1 && month === 12 ? -1 : 0);
  const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${match[2]} · ${match[5].padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}
export function flightDuration(value: string) { return value.replace(/\bhrs?\b/gi, 'h').replace(/\bmins?\b/gi, 'min'); }
export function money(value: number | null, currency = 'BRL') { return value == null ? 'Preço não informado' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: /^[A-Z]{3}$/.test(currency) ? currency : 'BRL' }).format(value); }
export function dateBR(value: string) { const d = new Date(`${value}T00:00:00Z`); return Number.isNaN(d.valueOf()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(d); }
export function stayNightsDiffer(nights: number | null, checkin?: string, checkout?: string) {
  if (nights == null || !checkin || !checkout) return false;
  const expected = (Date.parse(`${checkout}T00:00:00Z`) - Date.parse(`${checkin}T00:00:00Z`)) / 86_400_000;
  return Number.isFinite(expected) && nights !== expected;
}
