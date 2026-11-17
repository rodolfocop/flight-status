function cycleDate(year: number, month: number, day: number): Date {
  const first = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return first;
}

export function cycleStart(anchor: string, now = new Date()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) throw new Error('Configure a data de início do ciclo da RapidAPI.');
  const initial = new Date(`${anchor}T00:00:00Z`);
  if (Number.isNaN(initial.getTime()) || initial.toISOString().slice(0, 10) !== anchor || initial > now) throw new Error('A data do ciclo da RapidAPI é inválida.');
  let date = cycleDate(now.getUTCFullYear(), now.getUTCMonth(), initial.getUTCDate());
  if (date > now) date = cycleDate(now.getUTCFullYear(), now.getUTCMonth() - 1, initial.getUTCDate());
  return date.toISOString().slice(0, 10);
}
