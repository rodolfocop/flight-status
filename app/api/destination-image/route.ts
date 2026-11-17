import { NextResponse } from 'next/server';
import { localRequest } from '@/lib/local/mode';
import { natalImage, type DestinationImage } from '@/lib/travel/destination-image';
import airports from '@/lib/data/airports.json';

const cache = new Map<string, DestinationImage | null>();
const clean = (value: unknown) => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim().slice(0, 180) : '';
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
const headers = { 'User-Agent': 'DestinoCertoLocal/1.0 (https://github.com/rodolfocop/flight-status)', Accept: 'application/json' };
async function wikiJson(url: string) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000), redirect: 'error' });
  if (!response.ok) throw new Error('Imagem indisponível');
  return response.json();
}
async function findImage(city: string, country: string): Promise<DestinationImage | null> {
  const summary = await wikiJson(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`);
  if (summary.type !== 'standard' || normalize(summary.title || '') !== normalize(city) || typeof summary.originalimage?.source !== 'string' || typeof summary.thumbnail?.source !== 'string') return null;
  const description = normalize(`${summary.description || ''} ${summary.extract || ''}`);
  const countryName = new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(country) || '';
  const countryMatch = country === 'BR' ? /brasil|brasileir/.test(description) : countryName && description.includes(normalize(countryName));
  if (!countryMatch || !/cidade|municipio|capital|metropole|comuna|localidade/.test(description)) return null;
  const original = new URL(summary.originalimage.source);
  const thumbnail = new URL(summary.thumbnail.source);
  const imageHosts = new Set(['upload.wikimedia.org', 'thumb.wikimedia.org']);
  if (original.protocol !== 'https:' || !imageHosts.has(original.hostname) || thumbnail.protocol !== 'https:' || !imageHosts.has(thumbnail.hostname)) return null;
  thumbnail.search = '';
  const segments = original.pathname.split('/');
  const filename = decodeURIComponent((segments.includes('thumb') ? segments.at(-2) : segments.at(-1)) || '');
  if (!filename) return null;
  const params = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|extmetadata', titles: `File:${filename}` });
  const info = await wikiJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const page = Object.values(info.query?.pages || {})[0] as { imageinfo?: Array<{ descriptionurl?: string; extmetadata?: Record<string, {value?: string}> }> } | undefined;
  const image = page?.imageinfo?.[0], metadata = image?.extmetadata;
  const license = clean(metadata?.LicenseShortName?.value), credit = clean(metadata?.Artist?.value);
  if (!credit || !/^(CC BY(?:-SA)?(?: [0-9.]+)?|CC0|Public domain|PD)$/i.test(license) || !image?.descriptionurl) return null;
  const rawLicense = metadata?.LicenseUrl?.value || (/^CC0$/i.test(license) ? 'https://creativecommons.org/publicdomain/zero/1.0/' : '');
  if (!rawLicense) return null;
  const source = new URL(image.descriptionurl), licenseUrl = new URL(rawLicense);
  if (licenseUrl.protocol === 'http:' && licenseUrl.hostname === 'creativecommons.org') licenseUrl.protocol = 'https:';
  if (source.protocol !== 'https:' || source.hostname !== 'commons.wikimedia.org' || licenseUrl.protocol !== 'https:' || licenseUrl.hostname !== 'creativecommons.org') return null;
  return { src: thumbnail.toString(), credit, source: source.toString(), license, licenseUrl: licenseUrl.toString(), modified: true };
}
export async function GET(request: Request) {
  if (!localRequest(request)) return NextResponse.json({ image: null }, { status: 401 });
  const code = new URL(request.url).searchParams.get('airport')?.toUpperCase() || '';
  if (!/^[A-Z]{3}$/.test(code)) return NextResponse.json({ image: null }, { status: 400 });
  if (code === 'NAT') return NextResponse.json({ image: natalImage });
  if (cache.has(code)) return NextResponse.json({ image: cache.get(code) });
  const airport = airports.find(item => item.code === code);
  if (!airport?.city || !/^[A-Z]{2}$/.test(airport.country)) return NextResponse.json({ image: null });
  try {
    const image = await findImage(airport.city, airport.country);
    cache.set(code, image);
    return NextResponse.json({ image });
  } catch { return NextResponse.json({ image: null }); }
}
