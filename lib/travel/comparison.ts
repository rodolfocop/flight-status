import type { FlightOffer, StayOffer, StayQuery } from './schema';

export type PricePoint = { amount: number; currency: string };
type PricedOffer = { link: string | null; currency: string };

export function lowestPrice<T extends PricedOffer>(offers: T[], amount: (offer: T) => number | null): PricePoint | null {
  if (offers.some(offer => { const value = amount(offer); return value != null && Number.isFinite(value) && value >= 0 && !/^[A-Z]{3}$/.test(offer.currency); })) return null;
  const priced = offers.flatMap(offer => {
    const value = amount(offer);
    return value != null && Number.isFinite(value) && value >= 0 && /^[A-Z]{3}$/.test(offer.currency)
      ? [{ amount: value, currency: offer.currency }] : [];
  });
  if (!priced.length || new Set(priced.map(item => item.currency)).size !== 1) return null;
  return priced.reduce((lowest, item) => item.amount < lowest.amount ? item : lowest);
}

export function priceChange(older: PricePoint | null, newer: PricePoint | null): number | null {
  if (!older || !newer || older.currency !== newer.currency) return null;
  return Math.round((newer.amount - older.amount) * 100) / 100;
}

export function matchingPrices<T extends PricedOffer>(older: T[], newer: T[], amount: (offer: T) => number | null) {
  const uniqueByLink = (offers: T[]) => {
    const byLink = new Map<string, T | null>();
    for (const offer of offers) if (offer.link) byLink.set(offer.link, byLink.has(offer.link) ? null : offer);
    return byLink;
  };
  const oldByLink = uniqueByLink(older);
  const newByLink = uniqueByLink(newer);
  let same = 0, increased = 0, decreased = 0;
  for (const [link, current] of newByLink) {
    const previous = oldByLink.get(link);
    if (!current || !previous || current.currency !== previous.currency || !/^[A-Z]{3}$/.test(current.currency)) continue;
    const oldPrice = amount(previous), newPrice = amount(current);
    if (oldPrice == null || newPrice == null || !Number.isFinite(oldPrice) || !Number.isFinite(newPrice) || oldPrice < 0 || newPrice < 0) continue;
    const difference = Math.round((newPrice - oldPrice) * 100);
    if (difference === 0) same++; else if (difference > 0) increased++; else decreased++;
  }
  return { same, increased, decreased, total: same + increased + decreased };
}

export function sameStayPeriod(a?: StayQuery, b?: StayQuery) {
  return !!a && !!b && a.checkin === b.checkin && a.checkout === b.checkout && a.adults === b.adults;
}

export const flightAmount = (offer: FlightOffer) => offer.price;
export const stayAmount = (offer: StayOffer) => offer.total;
