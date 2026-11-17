/* eslint-disable @next/next/no-img-element */
'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, BedDouble, CalendarDays, Clock3, ExternalLink, ImageOff, Luggage, MapPin, Pause, Plane, Play, UsersRound } from 'lucide-react';
import type { FlightOffer, Layover, StayOffer } from '@/lib/travel/schema';
import { natalImage, type DestinationImage } from '@/lib/travel/destination-image';
import { dateBR, flightDuration, flightTime, money, stayNightsDiffer } from '@/lib/travel/presentation';

type Destination = { id: string; origin: string; destination: string; destination_name: string; departure_date: string; return_date: string | null; passengers: number; active: boolean; last_checked_at: string | null; last_error: string | null; monitor_until: string; flight_snapshots: { lowest_price: number | null; currency: string; offers: FlightOffer[] }[] };
export function DestinationCard({ trip, local, busy, onOpen, onRefresh, onStays, onToggle, quotaBlocked, timeZone }: { trip: Destination; local: boolean; busy: boolean; onOpen: () => void; onRefresh: () => void; onStays: () => void; onToggle: () => void; quotaBlocked: boolean; timeZone?: string }) {
  const [image, setImage] = useState<DestinationImage | null>(trip.destination === 'NAT' ? natalImage : null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (trip.destination === 'NAT' || !local) return;
    const controller = new AbortController();
    fetch(`/api/destination-image?airport=${encodeURIComponent(trip.destination)}`, { signal: controller.signal }).then(response => response.ok ? response.json() : null).then(data => { if (data?.image) setImage(data.image); }).catch(() => {});
    return () => controller.abort();
  }, [trip.destination, local]);
  const lowest = trip.flight_snapshots[0]?.lowest_price;
  return <article className="destination-card glass">
    <button type="button" className="destination-card__visual" onClick={onOpen} aria-label={`Abrir viagem para ${trip.destination_name}`}>
      {image && !failed ? <img src={image.src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : <span className="destination-card__empty" aria-hidden="true"><MapPin size={28}/></span>}
      <span className="destination-card__shade" aria-hidden="true"/>
      <span className="destination-card__badge"><Plane size={13}/> {trip.active ? (quotaBlocked ? 'Limite automático atingido' : 'Acompanhando') : 'Monitoramento pausado'}</span>
      <span className="destination-card__copy"><span className="destination-card__place">{trip.destination_name}</span><span className="destination-card__route">{trip.origin} <ArrowRight size={14}/> {trip.destination}</span><span className="destination-card__dates"><CalendarDays size={14}/> {dateBR(trip.departure_date)}{trip.return_date ? ` a ${dateBR(trip.return_date)}` : ' · só ida'}</span><span className="destination-card__price">{lowest == null ? 'Sem preço salvo' : `A partir de ${money(lowest, trip.flight_snapshots[0]?.currency)}`}</span></span>
    </button>
    <div className="destination-card__meta"><span><UsersRound size={14}/> {trip.passengers} {trip.passengers === 1 ? 'adulto' : 'adultos'}</span><button type="button" onClick={onOpen}>Ver viagem <ArrowRight size={14}/></button></div>
    <div className="destination-card__actions"><button type="button" onClick={onRefresh} disabled={busy}>Atualizar voos</button><button type="button" onClick={onStays}>Hospedagens</button><button type="button" onClick={onToggle} disabled={busy} aria-label={trip.active ? 'Pausar monitoramento' : 'Retomar monitoramento'}>{trip.active ? <Pause size={15}/> : <Play size={15}/>}</button></div>
    <div className="destination-card__foot">{trip.last_checked_at ? `Última consulta: ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone }).format(new Date(trip.last_checked_at))}` : 'Nenhuma consulta realizada'}{trip.last_error ? ` · ${trip.last_error}` : ''}</div>
    {image && !failed && <div className="destination-card__credit"><a href={image.source} target="_blank" rel="noopener noreferrer">Foto: {image.credit}</a> · <a href={image.licenseUrl} target="_blank" rel="noopener noreferrer">{image.license}</a>{image.modified ? ' · imagem adaptada' : ''}</div>}
  </article>;
}
function Stops({ count, layovers, total }: { count: number | null | undefined; layovers?: Layover[]; total?: boolean }) {
  return <span>{count == null ? 'Conexões não informadas' : count === 0 ? 'Voo direto' : `${count} ${count === 1 ? 'conexão' : 'conexões'}${total ? ' no total' : ''}`}{layovers?.length ? ` · ${layovers.map(stop => `${stop.airport}${stop.durationSeconds != null ? ` (${Math.floor(stop.durationSeconds / 3600)}h${String(Math.floor(stop.durationSeconds % 3600 / 60)).padStart(2, '0')})` : ''}`).join(', ')}` : ''}</span>;
}
export function FlightCard({ offer, origin, destination, departureDate, returnDate, passengers }: { offer: FlightOffer; origin: string; destination: string; departureDate: string; returnDate: string | null; passengers: number }) {
  const isRound = !!returnDate;
  return <article className="flight-card"><div className="flight-card__top"><div><strong>{offer.airline}</strong><span>{isRound ? 'Ida e volta' : 'Somente ida'} · {passengers} {passengers === 1 ? 'adulto' : 'adultos'}</span></div><div className="flight-card__price"><strong>{money(offer.price, offer.currency)}</strong><span>Preço total informado</span></div></div>
    <div className="flight-leg"><div className="flight-leg__label"><Plane size={15}/> Ida</div><div><strong>{origin} → {destination}</strong><span>{flightTime(offer.departure, departureDate)} → {flightTime(offer.arrival, departureDate)}</span><small>{flightDuration(offer.duration)} · <Stops count={offer.outboundStops ?? (!isRound ? offer.stops : null)} layovers={offer.outboundLayovers}/></small></div></div>
    {isRound && <div className="flight-leg"><div className="flight-leg__label"><Plane size={15}/> Volta</div><div><strong>{destination} → {origin}</strong><span>{offer.returnDeparture ? flightTime(offer.returnDeparture, returnDate) : 'Horário não informado'} → {offer.returnArrival ? flightTime(offer.returnArrival, returnDate) : 'Horário não informado'}</span><small>{offer.returnAirline ? `${offer.returnAirline} · ` : ''}{offer.returnDuration ? `${flightDuration(offer.returnDuration)} · ` : ''}<Stops count={offer.returnStops} layovers={offer.returnLayovers}/></small></div></div>}
    {isRound && offer.stops != null && <p className="flight-card__note"><Stops count={offer.stops} total/></p>}
    <div className="flight-card__bottom"><span><Clock3 size={14}/> Horários locais dos aeroportos</span>{offer.link && <a href={offer.link} target="_blank" rel="noopener noreferrer">Ver oferta <ExternalLink size={14}/></a>}</div><details className="fare-details"><summary><Luggage size={14}/> Bagagem e benefícios</summary><p>Não informados nesta consulta. Confira as regras da tarifa no fornecedor.</p></details>
  </article>;
}
export function StayCard({ stay, checkin, checkout }: { stay: StayOffer; checkin?: string; checkout?: string }) {
  const [failed, setFailed] = useState(false);
  const hasImage = !!stay.imageUrl && !failed;
  const nightsDiffer = stayNightsDiffer(stay.nights, checkin, checkout);
  return <article className={`stay-card${hasImage ? '' : ' stay-card--no-image'}`}><div className="stay-card__image">{hasImage ? <img src={stay.imageUrl!} alt={`Foto de ${stay.name}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : <span><ImageOff size={16}/> Foto não disponível</span>}</div><div className="stay-card__body"><div className="stay-card__heading"><div><strong>{stay.name}</strong><p>{stay.rating != null ? `Avaliação ${stay.rating}/5${stay.reviews != null ? ` · ${stay.reviews} avaliações` : ''}` : 'Avaliação não informada'}</p></div><div className="stay-card__price"><strong>{money(stay.total, stay.currency)}</strong><span>Total informado</span></div></div><div className="stay-card__facts"><span><CalendarDays size={14}/> {checkin && checkout ? `${dateBR(checkin)} a ${dateBR(checkout)}` : 'Datas no fornecedor'}</span>{stay.nights != null && <span>{stay.nights} {stay.nights === 1 ? 'noite informada' : 'noites informadas'} pelo fornecedor</span>}{stay.bedrooms != null && <span><BedDouble size={14}/> {stay.bedrooms} {stay.bedrooms === 1 ? 'quarto' : 'quartos'}</span>}{stay.beds != null && <span>{stay.beds} {stay.beds === 1 ? 'cama' : 'camas'}</span>}{stay.baths != null && <span>{stay.baths} {stay.baths === 1 ? 'banheiro' : 'banheiros'}</span>}</div>{nightsDiffer && <p className="stay-card__warning">O número de noites informado difere das datas pesquisadas. Confira o período e o total no fornecedor.</p>}<div className="stay-card__bottom"><span>{stay.nightly != null ? `${money(stay.nightly, stay.currency)} por noite · ` : ''}Taxas a confirmar</span>{stay.link && <a href={stay.link} target="_blank" rel="noopener noreferrer">Ver hospedagem <ExternalLink size={14}/></a>}</div></div></article>;
}
