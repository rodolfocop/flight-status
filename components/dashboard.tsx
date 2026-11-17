'use client';
import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { ArrowLeftRight, ArrowRight, BedDouble, CalendarDays, ChevronRight, CircleAlert, Clock3, LogOut, MapPin, Plane, Search, ShieldCheck, Sparkles, Ticket, UsersRound } from 'lucide-react';
import { signOut } from '@/app/login/actions';
import LocalSettings from '@/components/local-settings';
import LocalAssistant from '@/components/local-assistant';
import LayoutSwitch, { useLayout } from '@/components/layout-switch';
import PriceHistory from '@/components/price-history';
import TimeZoneSettings from '@/components/time-zone-settings';
import QuotaRenewal from '@/components/quota-renewal';
import { DestinationCard, FlightCard, StayCard } from '@/components/travel-cards';
import airports from '@/lib/data/airports.json';
import type { FlightOffer, FlightQuery, StayOffer, StayQuery } from '@/lib/travel/schema';
import { dateInZone, validTimeZone } from '@/lib/travel/time-zone';

type Snapshot = { id: string; checked_at: string; lowest_price: number | null; currency: string; offers: FlightOffer[] };
type StaySnapshot = { id: string; checkedAt: string; offers: StayOffer[]; query?: StayQuery };
type SavedStaySnapshot = StaySnapshot & { query: StayQuery };
type Saved = { id: string; origin: string; destination: string; destination_name: string; departure_date: string; return_date: string | null; passengers: number; max_price: number | null; max_stops: number | null; monitor_until: string; active: boolean; last_checked_at: string | null; last_error: string | null; flight_snapshots: Snapshot[] };
type Quota = { provider: 'flights' | 'stays'; configured: boolean; used: number | null; cycle: string | null; nextResetAt?: string | null };
type FlightForm = { origin: string; destination: string; departureDate: string; returnDate: string; passengers: number; maxPrice: string; maxStops: string; monitorUntil: string };
const initial: FlightForm = { origin: '', destination: '', departureDate: '', returnDate: '', passengers: 1, maxPrice: '', maxStops: '', monitorUntil: '' };
const formatDate = (value: string, zone?: string) => { const d = new Date(value); return Number.isNaN(d.valueOf()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: value.includes('T') ? 'short' : undefined, timeZone: value.includes('T') ? zone : 'UTC' }).format(d); };
const formatTimestamp = (value: string, zone?: string) => { const d = new Date(value); return Number.isNaN(d.valueOf()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: zone }).format(d); };
const stayDescription = (snapshot: StaySnapshot, zone?: string) => `Resultado anterior · Consulta em ${formatDate(snapshot.checkedAt, zone)}${snapshot.query ? ` · Estadia de ${formatDate(snapshot.query.checkin)} a ${formatDate(snapshot.query.checkout)} · ${snapshot.query.adults} adulto(s)` : ''}. Confirme as datas e taxas no fornecedor.`;
const code = (v: string) => v.match(/\(([A-Z]{3})\)$/)?.[1] || (/^[A-Za-z]{3}$/.test(v.trim()) ? v.trim().toUpperCase() : '');
const cityFor = (value: string) => airports.find(a => a.code === code(value))?.city || code(value);
const label = (a: typeof airports[number]) => `${a.city || a.name} · ${a.name} (${a.code})`;
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Não foi possível concluir a operação.');
  return body as T;
}
function AirportField({ title, value, onChange }: { title: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  const matching = useMemo(() => {
    const query = value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (query.length < 2) return [];
    return airports.filter(a => `${a.code} ${a.city} ${a.name} ${a.country}`.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(query)).slice(0, 18);
  }, [value]);
  return <label className="field airport-field"><span>{title}</span><span className="input-wrap"><Plane size={17} aria-hidden="true"/><input list={id} value={value} onChange={e => onChange(e.target.value)} placeholder="Cidade ou IATA" required autoComplete="off"/></span><datalist id={id}>{matching.map(a => <option key={`${a.code}-${a.name}`} value={label(a)} />)}</datalist></label>;
}
export default function Dashboard({ preview = false, local = false }: { preview?: boolean; local?: boolean }) {
  const layout = useLayout();
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState<'flights' | 'stays'>('flights');
  const [tripType, setTripType] = useState<'round' | 'oneway'>('round');
  const [saved, setSaved] = useState<Saved[]>([]);
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [lastFlight, setLastFlight] = useState<FlightQuery | null>(null);
  const [lastFlightId, setLastFlightId] = useState<string | null>(null);
  const [flightChecked, setFlightChecked] = useState<string | null>(null);
  const [stayOffers, setStayOffers] = useState<StayOffer[]>([]);
  const [stayChecked, setStayChecked] = useState<string | null>(null);
  const [stayResultQuery, setStayResultQuery] = useState<StayQuery | null>(null);
  const [stayCached, setStayCached] = useState(false);
  const [stayForm, setStayForm] = useState({ destination: '', checkin: '', checkout: '', adults: 1 });
  const [stayTripId, setStayTripId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searched, setSearched] = useState(false);
  const [staySearched, setStaySearched] = useState(false);
  const [detail, setDetail] = useState<Saved | null>(null);
  const [detailStays, setDetailStays] = useState<StayOffer[]>([]);
  const [detailFlightId, setDetailFlightId] = useState('');
  const [detailStayId, setDetailStayId] = useState('');
  const [showAllFlights, setShowAllFlights] = useState(false);
  const [showAllStays, setShowAllStays] = useState(false);
  const [stayHistory, setStayHistory] = useState<StaySnapshot[]>([]);
  const [savedStays, setSavedStays] = useState<SavedStaySnapshot[]>([]);
  const [detailInfo, setDetailInfo] = useState('');
  const [detailHistoryError, setDetailHistoryError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(!preview);
  const [timeZone, setTimeZone] = useState<string | null>(null);
  const [zoneError, setZoneError] = useState('');
  const [zoneLoading, setZoneLoading] = useState(true);
  const [clock, setClock] = useState(0);
  const today = timeZone ? dateInZone(new Date(clock || Date.now()), timeZone) : '';
  const displayDate = (value: string) => formatDate(value, timeZone || undefined);
  const displayTimestamp = (value: string) => formatTimestamp(value, timeZone || undefined);
  const loadTimeZone = useCallback(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const request = preview ? Promise.resolve({ timeZone: validTimeZone(detected) ? detected : null }) : api<{ timeZone: string | null }>('/api/time-zone');
    return request.then(async result => {
      if (!result.timeZone && !preview && validTimeZone(detected)) return api<{ timeZone: string | null }>('/api/time-zone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeZone: detected, onlyIfMissing: true }) });
      return result;
    }).then(result => {
      if (!validTimeZone(result.timeZone)) throw new Error('Não foi possível identificar o fuso horário. Informe-o abaixo.');
      setTimeZone(result.timeZone); setZoneError('');
    }).catch(error => setZoneError(error instanceof Error ? error.message : 'Não foi possível carregar o fuso horário.'))
      .finally(() => setZoneLoading(false));
  }, [preview]);
  useEffect(() => { void loadTimeZone(); }, [loadTimeZone]);
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  async function reload() {
    try {
      const [s, q, h] = await Promise.all([api<{ searches: Saved[] }>('/api/searches'), api<{ quotas: Quota[] }>('/api/quota'), local ? api<{ snapshots: SavedStaySnapshot[] }>('/api/stays/history') : Promise.resolve({ snapshots: [] })]);
      setSaved(s.searches); setQuotas(q.quotas); setSavedStays(h.snapshots);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Não foi possível carregar suas pesquisas.'); }
    finally { setLoadingSaved(false); }
  }
  useEffect(() => {
    if (preview) return;
    let active = true;
    const update = () => Promise.all([api<{ searches: Saved[] }>('/api/searches'), api<{ quotas: Quota[] }>('/api/quota'), local ? api<{ snapshots: SavedStaySnapshot[] }>('/api/stays/history') : Promise.resolve({ snapshots: [] })])
      .then(([s, q, h]) => { if (active) { setSaved(s.searches); setQuotas(q.quotas); setSavedStays(h.snapshots); } })
      .catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : 'Não foi possível carregar suas pesquisas.'); })
      .finally(() => { if (active) setLoadingSaved(false); });
    void update();
    const timer = local ? window.setInterval(() => { void update(); }, 60_000) : undefined;
    return () => { active = false; window.clearInterval(timer); };
  }, [preview, local]);
  useEffect(() => {
    if (!detail) return;
    const heading = document.getElementById('detalhes-viagem');
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, [detail]);
  const payload = () => ({ origin: code(form.origin), destination: code(form.destination), destinationName: cityFor(form.destination), departureDate: form.departureDate, returnDate: tripType === 'round' ? form.returnDate : null, passengers: form.passengers, maxPrice: form.maxPrice ? Number(form.maxPrice) : null, maxStops: form.maxStops !== '' ? Number(form.maxStops) : null });
  const validate = () => { if (!code(form.origin) || !code(form.destination)) throw new Error('Selecione uma cidade ou aeroporto da lista, ou digite um código IATA.'); if (tripType === 'round' && !form.returnDate) throw new Error('Informe a data de volta.'); };
  async function findFlights(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage(''); setBusy('flights');
    if (preview) { setMessage('Prévia visual: configure os serviços para pesquisar voos reais.'); setBusy(null); return; }
    try { validate(); const query = payload(); const result = await api<{ offers: FlightOffer[]; checkedAt: string; searchId?: string }>('/api/flights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query) }); setLastFlight(query); setLastFlightId(result.searchId || null); setOffers(result.offers); setFlightChecked(result.checkedAt); setSearched(true); void reload(); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Falha ao pesquisar voos.'); } finally { setBusy(null); }
  }
  async function saveSearch() {
    setMessage(''); setBusy('save');
    if (preview) { setMessage('Prévia visual: configure os serviços para salvar pesquisas.'); setBusy(null); return; }
    try { validate(); if (!form.monitorUntil) throw new Error('Escolha até quando deseja acompanhar a pesquisa.'); await api('/api/searches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload(), monitorUntil: form.monitorUntil }) }); setMessage('Pesquisa salva. Ela poderá ser acompanhada diariamente.'); await reload(); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Falha ao salvar.'); } finally { setBusy(null); }
  }
  async function toggle(search: Saved) {
    setBusy(search.id); setMessage('');
    try { await api(`/api/searches/${search.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !search.active }) }); await reload(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Falha ao atualizar.'); } finally { setBusy(null); }
  }
  async function refresh(search: Saved) {
    setBusy(search.id); setMessage('');
    try { const query = { origin: search.origin, destination: search.destination, destinationName: search.destination_name, departureDate: search.departure_date, returnDate: search.return_date, passengers: search.passengers, maxPrice: search.max_price, maxStops: search.max_stops }; const result = await api<{ offers: FlightOffer[]; checkedAt: string }>('/api/flights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ searchId: search.id, ...query }) }); setLastFlight(query); setLastFlightId(search.id); setOffers(result.offers); setFlightChecked(result.checkedAt); setSearched(true); setTab('flights'); await reload(); document.getElementById('resultados')?.scrollIntoView({ behavior: 'smooth' }); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Falha ao atualizar.'); } finally { setBusy(null); }
  }
  async function findStays(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage(''); setBusy('stays');
    if (preview) { setMessage('Prévia visual: configure os serviços para pesquisar hospedagens reais.'); setBusy(null); return; }
    try {
      const query = { ...stayForm };
      const result = await api<{ offers: StayOffer[]; checkedAt: string; cached: boolean }>('/api/stays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...query, ...(local && stayTripId ? { searchId: stayTripId } : {}) }) });
      setStayOffers(result.offers); setStayResultQuery(query); setStayChecked(result.checkedAt); setStayCached(result.cached); setStaySearched(true); void reload();
      if (local && stayTripId) {
        const { searches } = await api<{ searches: Saved[] }>('/api/searches');
        const trip = searches.find(item => item.id === stayTripId && item.destination_name.trim().toLocaleLowerCase('pt-BR') === query.destination.trim().toLocaleLowerCase('pt-BR'));
        if (trip) await openDetails(trip);
      }
    }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Falha ao pesquisar hospedagens.'); } finally { setBusy(null); }
  }
  async function openDetails(search: Saved) {
    if (detailLoading) return;
    setDetail(search); setDetailFlightId(search.flight_snapshots?.[0]?.id || ''); setShowAllFlights(false); setShowAllStays(false); setDetailStays([]); setStayHistory([]); setDetailStayId(''); setDetailInfo(''); setDetailHistoryError('');
    setDetailLoading(true);
    try {
      if (!local && (!search.return_date || search.return_date <= search.departure_date)) { setDetailInfo('Informe as datas de hospedagem para consultar opções.'); return; }
      const params = local ? new URLSearchParams({ searchId: search.id }) : new URLSearchParams({ destination: search.destination_name, checkin: search.departure_date, checkout: search.return_date!, adults: String(search.passengers) });
      const result = await api<{ found: boolean; snapshots: StaySnapshot[] }>(`/api/stays?${params}`);
      setStayHistory(result.snapshots); setDetailStayId(result.snapshots[0]?.id || ''); setDetailStays(result.snapshots[0]?.offers || []); setDetailInfo(result.found && result.snapshots[0] ? stayDescription(result.snapshots[0]) : 'Nenhuma hospedagem salva para esta viagem. Você pode consultar opções ao ajustar os dados da estadia.');
    } catch (error) { const message = error instanceof Error ? error.message : 'Não foi possível carregar as hospedagens salvas.'; setDetailInfo(message); setDetailHistoryError(message); } finally { setDetailLoading(false); }
  }
  function chooseStays(search?: Saved) {
    if (!search && tab === 'stays') { document.getElementById('search-title')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); return; }
    setStayTripId(search?.id || lastFlightId);
    setStayForm({ destination: search?.destination_name || lastFlight?.destinationName || cityFor(form.destination), checkin: search?.departure_date || lastFlight?.departureDate || form.departureDate, checkout: search ? (search.return_date || '') : (lastFlight?.returnDate || ''), adults: search?.passengers || lastFlight?.passengers || form.passengers }); setTab('stays'); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function openSavedStay(snapshot: SavedStaySnapshot) {
    setDetail(null); setStayTripId(null); setStayForm(snapshot.query); setStayResultQuery(snapshot.query); setStayOffers(snapshot.offers); setStayChecked(snapshot.checkedAt); setStayCached(true); setStaySearched(true); setTab('stays');
    requestAnimationFrame(() => document.getElementById('hospedagens-resultados')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  function openSettings() {
    const panel = document.getElementById('configuracoes');
    if (!(panel instanceof HTMLDetailsElement)) return;
    panel.open = true;
    panel.querySelector('summary')?.focus({ preventScroll: true });
    panel.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  function openFlights() {
    setTab('flights');
    document.getElementById('search-title')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  const detailFlight = detail?.flight_snapshots.find(s => s.id === detailFlightId) || detail?.flight_snapshots[0];
  const detailStayQuery = stayHistory.find(s => s.id === detailStayId)?.query;
  const quota = (kind: 'flights' | 'stays') => quotas.find(q => q.provider === kind);
  return <main className={`dashboard scenery${layout === 'ferias' ? ' theme-vacation' : ''}`}>
    <div className="app-shell">
      <header className="topbar glass"><a className="brand" href="#inicio"><span className="brand-mark"><Image src="/destino-certo-symbol.svg" alt="" width={36} height={36}/></span>Destino Certo</a><nav aria-label="Navegação principal"><button type="button" className={tab === 'flights' ? 'active' : ''} onClick={openFlights}><Search size={17} aria-hidden="true"/> Pesquisar</button><a href="#salvas"><Clock3 size={17} aria-hidden="true"/> Monitoramentos</a><button type="button" className={tab === 'stays' ? 'active' : ''} onClick={() => chooseStays()}><BedDouble size={18} aria-hidden="true"/> Hospedagens</button>{local && <button type="button" onClick={openSettings}>Configurações</button>}</nav><LayoutSwitch/>{!local && <form action={signOut}><button className="signout" type="submit"><LogOut size={17} aria-hidden="true"/><span>Sair</span></button></form>}</header>
      <section className="hero" id="inicio"><div className="hero-copy"><p className="hero-note"><span className="live-dot"/> SEU ESPAÇO DE VIAGEM</p><h1>Planeje sua<br/><span>próxima viagem.</span></h1><p>Encontre passagens, acompanhe preços e descubra onde ficar.</p></div><div className="hero-aside"><span>O MUNDO À SUA ESPERA</span><p>Mais tempo para escolher.<br/>Menos tempo procurando.</p></div></section>
      <section className="search-panel glass" aria-labelledby="search-title"><div className="panel-heading"><div><h2 id="search-title">{tab === 'flights' ? 'Para onde vamos?' : 'Encontre um lugar para ficar'}</h2><p>{tab === 'flights' ? 'Escolha sua rota. Os resultados ficam salvos neste computador.' : 'Busque estadias para as datas da sua viagem.'}</p></div><div className="tabs" role="group" aria-label="Tipo de pesquisa"><button type="button" aria-pressed={tab === 'flights'} className={tab === 'flights' ? 'selected' : ''} onClick={() => setTab('flights')}><Plane size={16} aria-hidden="true"/> Voos</button><button type="button" aria-pressed={tab === 'stays'} className={tab === 'stays' ? 'selected' : ''} onClick={() => chooseStays()}><BedDouble size={17} aria-hidden="true"/> Hospedagens</button></div></div>
        {tab === 'flights' ? <form onSubmit={findFlights} className="search-form"><div className="trip-type"><label><input type="radio" checked={tripType === 'round'} onChange={() => setTripType('round')}/> Ida e volta</label><label><input type="radio" checked={tripType === 'oneway'} onChange={() => setTripType('oneway')}/> Somente ida</label></div><div className="fields"><AirportField title="Origem" value={form.origin} onChange={v => setForm({ ...form, origin: v })}/><button type="button" className="swap" aria-label="Trocar origem e destino" onClick={() => setForm({ ...form, origin: form.destination, destination: form.origin })}><ArrowLeftRight size={18}/></button><AirportField title="Destino" value={form.destination} onChange={v => setForm({ ...form, destination: v })}/><label className="field"><span>Ida</span><span className="input-wrap"><CalendarDays size={17}/><input type="date" min={today} value={form.departureDate} onChange={e => setForm({ ...form, departureDate: e.target.value, monitorUntil: e.target.value })} required/></span></label>{tripType === 'round' && <label className="field"><span>Volta</span><span className="input-wrap"><CalendarDays size={17}/><input type="date" min={form.departureDate || today} value={form.returnDate} onChange={e => setForm({ ...form, returnDate: e.target.value })} required/></span></label>}<label className="field compact"><span>Adultos</span><span className="input-wrap"><UsersRound size={17}/><select value={form.passengers} onChange={e => setForm({ ...form, passengers: Number(e.target.value) })}>{Array.from({ length: 9 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></span></label><button className="primary search-button" type="submit" disabled={!!busy || !timeZone}><Search size={18}/>{busy === 'flights' ? 'Buscando...' : 'Buscar voos'}</button></div><details className="more-options"><summary>Filtros e acompanhamento <ChevronRight size={15}/></summary><div className="extra-fields"><label className="field"><span>Preço máximo (R$)</span><input type="number" min="1" placeholder="Sem limite" value={form.maxPrice} onChange={e => setForm({ ...form, maxPrice: e.target.value })}/></label><label className="field"><span>Máximo de conexões</span><select value={form.maxStops} onChange={e => setForm({ ...form, maxStops: e.target.value })}><option value="">Qualquer</option><option value="0">Direto</option><option value="1">Até 1</option><option value="2">Até 2</option><option value="3">Até 3</option></select></label><label className="field"><span>Acompanhar até</span><input type="date" min={today} max={form.departureDate || undefined} value={form.monitorUntil} onChange={e => setForm({ ...form, monitorUntil: e.target.value })}/></label><button type="button" className="secondary" onClick={saveSearch} disabled={!!busy || !timeZone}>{busy === 'save' ? 'Salvando...' : 'Salvar pesquisa'}</button></div></details></form> : <form onSubmit={findStays} className="stay-form"><div className="fields stay-fields"><label className="field"><span>Destino</span><span className="input-wrap"><MapPin size={17}/><input value={stayForm.destination} onChange={e => setStayForm({ ...stayForm, destination: e.target.value })} placeholder="Cidade ou região" required/></span></label><label className="field"><span>Entrada</span><span className="input-wrap"><CalendarDays size={17}/><input type="date" min={today} value={stayForm.checkin} onChange={e => setStayForm({ ...stayForm, checkin: e.target.value })} required/></span></label><label className="field"><span>Saída</span><span className="input-wrap"><CalendarDays size={17}/><input type="date" min={stayForm.checkin || today} value={stayForm.checkout} onChange={e => setStayForm({ ...stayForm, checkout: e.target.value })} required/></span></label><label className="field compact"><span>Adultos</span><span className="input-wrap"><UsersRound size={17}/><select value={stayForm.adults} onChange={e => setStayForm({ ...stayForm, adults: Number(e.target.value) })}>{Array.from({ length: 9 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></span></label><button className="primary search-button" disabled={!!busy || !timeZone}><Search size={18}/>{busy === 'stays' ? 'Buscando...' : 'Buscar estadias'}</button></div><p className="inline-note">Dados independentes do Airbnb. Confirme datas, disponibilidade e taxas antes de reservar.</p></form>}
      </section>
      {(message || preview) && <div className="message glass" role="status"><CircleAlert size={18}/>{message || 'Prévia visual local. As buscas reais estarão disponíveis após a configuração dos serviços.'}</div>}
      {!preview && <TimeZoneSettings key={timeZone || 'unset'} timeZone={timeZone} loading={zoneLoading} error={zoneError} onSaved={zone => { setTimeZone(zone); setZoneError(''); }} onRetry={() => { setZoneLoading(true); setZoneError(''); void loadTimeZone(); }}/>}
      {!preview && <QuotaRenewal quotas={quotas} onSaved={() => { void reload(); }}/>}
      {local && <LocalSettings timeZone={timeZone} onSaved={() => { void reload(); }}/>}
      <div className="content-grid"><div className="content-main">
        {tab === 'flights' && searched && <section id="resultados" className="results-section"><div className="section-title"><div><h2>Voos encontrados</h2><p>Consulta em {flightChecked && displayDate(flightChecked)} · valores sujeitos a alteração</p></div><button className="text-action" onClick={() => chooseStays()}>Ver hospedagens <ArrowRight size={15}/></button></div>{offers.length === 0 ? <div className="empty glass">Nenhuma oferta encontrada para essa pesquisa.</div> : <div className="offer-list">{offers.map((offer, i) => <FlightCard key={`${offer.link}-${i}`} offer={offer} origin={lastFlight?.origin || code(form.origin)} destination={lastFlight?.destination || code(form.destination)} departureDate={lastFlight?.departureDate || form.departureDate} returnDate={lastFlight?.returnDate || null} passengers={lastFlight?.passengers || form.passengers}/>)}</div>}</section>}
        {tab === 'stays' && staySearched && <section id="hospedagens-resultados" className="results-section"><div className="section-title"><div><h2>Hospedagens encontradas</h2><p>{stayCached ? 'Resultado anterior · ' : ''}Consulta em {stayChecked && displayDate(stayChecked)} · confira os valores no Airbnb</p></div></div>{stayOffers.length === 0 ? <div className="empty glass">Nenhuma hospedagem encontrada para essas datas.</div> : <div className="offer-list">{stayOffers.map((stay, i) => <StayCard key={`${stay.link}-${i}`} stay={stay} checkin={stayResultQuery?.checkin} checkout={stayResultQuery?.checkout}/>)}</div>}</section>}
        {detail && <section className="results-section trip-results" aria-labelledby="detalhes-viagem"><div className="section-title"><div><h2 id="detalhes-viagem" tabIndex={-1}>Detalhes da viagem</h2><p>{detail.origin} → {detail.destination} · {displayDate(detail.departure_date)}{detail.return_date ? ` a ${displayDate(detail.return_date)}` : ''}</p></div><button className="text-action" onClick={() => setDetail(null)}>Fechar</button></div>
          <PriceHistory timeZone={timeZone || undefined} flights={detail.flight_snapshots} stays={stayHistory} loading={detailLoading} error={detailHistoryError} fallbackStayQuery={!local && detail.return_date ? { destination: detail.destination_name, checkin: detail.departure_date, checkout: detail.return_date, adults: detail.passengers } : undefined}/>
          <div className="trip-results__heading"><div><h3>Voos encontrados</h3>{detailFlight && <p>Consulta em {displayDate(detailFlight.checked_at)} · preços podem mudar</p>}</div>{detail.flight_snapshots.length > 1 && <label className="field"><span>Consulta de voos</span><select value={detailFlight?.id || ''} onChange={e => { setDetailFlightId(e.target.value); setShowAllFlights(false); }}>{detail.flight_snapshots.map((snapshot, i) => <option key={snapshot.id} value={snapshot.id}>{displayTimestamp(snapshot.checked_at)}{i === 0 ? ' · mais recente' : ''}</option>)}</select></label>}</div>
          {detailFlight?.offers.length ? <div className="offer-list">{(showAllFlights ? detailFlight.offers : detailFlight.offers.slice(0, 2)).map((offer, i) => <FlightCard key={`${offer.link}-${i}`} offer={offer} origin={detail.origin} destination={detail.destination} departureDate={detail.departure_date} returnDate={detail.return_date} passengers={detail.passengers}/>)}{detailFlight.offers.length > 2 && <button type="button" className="show-more" onClick={() => setShowAllFlights(!showAllFlights)}>{showAllFlights ? 'Mostrar menos voos' : `Mostrar mais ${detailFlight.offers.length - 2} voos`}</button>}</div> : <div className="empty glass">{detailFlight ? 'Nenhum voo encontrado nessa consulta.' : 'Ainda não há voos consultados para esta viagem.'}</div>}
          <div className="trip-results__heading trip-results__heading--stays"><div><h3>Onde ficar em {detail.destination_name}</h3><p>{detailLoading ? 'Carregando hospedagens salvas...' : (stayHistory.find(item => item.id === detailStayId) ? stayDescription(stayHistory.find(item => item.id === detailStayId)!, timeZone || undefined) : detailInfo)}</p></div>{stayHistory.length > 1 && <label className="field"><span>Consulta de hospedagens</span><select value={detailStayId} onChange={e => { const snapshot = stayHistory.find(item => item.id === e.target.value); if (snapshot) { setDetailStayId(snapshot.id); setShowAllStays(false); setDetailStays(snapshot.offers); setDetailInfo(stayDescription(snapshot)); } }}>{stayHistory.map((snapshot, i) => <option key={snapshot.id} value={snapshot.id}>{displayTimestamp(snapshot.checkedAt)}{i === 0 ? ' · mais recente' : ''}</option>)}</select></label>}</div>
          {detailStays.length ? <div className="offer-list">{(showAllStays ? detailStays : detailStays.slice(0, 3)).map((stay, i) => <StayCard key={`${stay.link}-${i}`} stay={stay} checkin={detailStayQuery?.checkin} checkout={detailStayQuery?.checkout}/>)}{detailStays.length > 3 && <button type="button" className="show-more" onClick={() => setShowAllStays(!showAllStays)}>{showAllStays ? 'Mostrar menos hospedagens' : `Mostrar mais ${detailStays.length - 3} hospedagens`}</button>}</div> : !detailLoading && <div className="empty glass">Nenhuma hospedagem para mostrar nesta consulta.</div>}
          <button className="text-action trip-results__adjust" onClick={() => chooseStays(detail)}>Pesquisar hospedagens para outras datas <ArrowRight size={15}/></button>
        </section>}
        <section id="salvas" className="saved-section"><div className="section-title"><div><h2>Suas viagens e alertas</h2><p>Acompanhe as rotas que importam para você.</p></div><span className="count-label">{saved.length} {saved.length === 1 ? 'pesquisa' : 'pesquisas'}</span></div>{loadingSaved ? <div className="empty glass">Carregando pesquisas...</div> : saved.length === 0 ? <div className="empty glass"><div className="empty-icon"><Ticket size={24}/></div><div><strong>Sua próxima viagem começa aqui</strong><p>Salve uma pesquisa para acompanhar os preços ao longo do tempo.</p></div></div> : <div className="destination-grid">{saved.map(search => <DestinationCard key={search.id} timeZone={timeZone || undefined} trip={search} local={local} busy={!!busy} quotaBlocked={quota('flights')?.used != null && quota('flights')!.used! >= 40} onOpen={() => { void openDetails(search); }} onRefresh={() => { void refresh(search); }} onStays={() => chooseStays(search)} onToggle={() => { void toggle(search); }}/>)}</div>}</section>
        {local && savedStays.length > 0 && <section className="saved-section"><div className="section-title"><div><h2>Hospedagens pesquisadas</h2><p>Abra uma consulta anterior sem usar sua franquia.</p></div></div><div className="saved-list">{savedStays.map(snapshot => <article className="saved-row glass" key={snapshot.id}><div className="route-symbol"><BedDouble size={19}/></div><div className="saved-details"><strong>{snapshot.query.destination}</strong><p>{displayDate(snapshot.query.checkin)} a {displayDate(snapshot.query.checkout)} · {snapshot.query.adults} adulto(s)</p><small>Consultada em {displayDate(snapshot.checkedAt)} · {snapshot.offers.length} opções</small></div><div className="saved-actions"><button onClick={() => openSavedStay(snapshot)}>Ver resultados</button></div></article>)}</div></section>}
      </div><aside className="side-column"><section className="side-panel glass"><div className="aside-icon"><ShieldCheck size={19}/></div><h2>Seu planejamento, com calma.</h2><p>Acompanhe as consultas registradas neste aplicativo.</p><div className="quota-row"><span>Voos contabilizados</span><strong>{quota('flights')?.configured ? `${quota('flights')?.used} / 50` : 'Não configurado'}</strong></div><div className="quota-row"><span>Hospedagens contabilizadas</span><strong>{quota('stays')?.configured ? `${quota('stays')?.used} / 100` : 'Não configurado'}</strong></div><small>O acompanhamento automático para em 40 consultas de voos, reservando 10 para você.</small></section>{local ? <LocalAssistant offers={detail ? (detailFlight?.offers || []) : offers} tripName={detail?.destination_name}/> : <section className="ai-panel glass"><Sparkles size={19}/><div><h2>Assistente de viagem</h2><p>O assistente ficará disponível após configuração e autorização.</p><span>Não configurado</span></div></section>}<p className="disclaimer">Preços e disponibilidade podem mudar. Confira todos os detalhes no fornecedor antes de reservar.</p></aside></div>
      <footer className="footer"><span>Destino Certo · seu espaço de viagem</span><span>Dados de aeroportos: OurAirports</span></footer>
    </div>
  </main>;
}
