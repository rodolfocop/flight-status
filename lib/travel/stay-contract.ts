import type { StayOffer } from './schema';
import { providerLink } from './flight-contract';
type Raw = Record<string, unknown>;
const str = (v: unknown, fallback = '') => typeof v === 'string' ? v : fallback;
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
export function normalizeStay(x: Raw): StayOffer {
  return { name: str(x.name, 'Hospedagem'), total: num(x.price_total), nightly: num(x.price_per_night), currency: str(x.currency, 'BRL'), rating: num(x.rating), reviews: num(x.review_count), nights: num(x.nights), beds: num(x.beds), bedrooms: num(x.bedrooms), baths: num(x.baths), imageUrl: providerLink(x.image_url, 'muscache.com') || providerLink(x.image_url, 'airbnb.com'), link: providerLink(x.link, 'airbnb.com') };
}
