import { CalendarDays } from 'lucide-react';
import { flightAmount, lowestPrice, matchingPrices, priceChange, sameStayPeriod, stayAmount, type PricePoint } from '@/lib/travel/comparison';
import { dateBR, money } from '@/lib/travel/presentation';
import type { FlightOffer, StayOffer, StayQuery } from '@/lib/travel/schema';

type FlightSnapshot = { id: string; checked_at: string; offers: FlightOffer[] };
type StaySnapshot = { id: string; checkedAt: string; offers: StayOffer[]; query?: StayQuery };
type HistoryEntry<T> = { id: string; checkedAt: string; offers: T[]; query?: StayQuery };
const timestamp = (value: string, timeZone?: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone }).format(date);
};
const displayPrice = (value: PricePoint | null) => value ? money(value.amount, value.currency) : 'Indisponível';
function History<T extends { link: string | null; currency: string }>({ title, entries, amount, comparable = true, stays = false, timeZone }: { title: string; entries: HistoryEntry<T>[]; amount: (offer: T) => number | null; comparable?: boolean; stays?: boolean; timeZone?: string }) {
  const [latest, previous] = entries;
  const latestPrice = latest ? lowestPrice(latest.offers, amount) : null;
  const previousPrice = previous ? lowestPrice(previous.offers, amount) : null;
  const change = comparable ? priceChange(previousPrice, latestPrice) : null;
  const matches = previous && comparable ? matchingPrices(previous.offers, latest.offers, amount) : null;
  return <section className="price-history__section" aria-label={`Histórico de ${title.toLocaleLowerCase('pt-BR')}`}>
    <h4>{title}</h4>
    {!latest ? <p className="price-history__empty">Nenhuma consulta salva ainda.</p> : <>
      <div className="price-history__table-wrap"><table className="price-history__table"><thead><tr><th scope="col">Consulta</th><th scope="col">Menor preço</th><th scope="col">Opções</th></tr></thead><tbody>
        {entries.map((entry, index) => <tr key={entry.id}><td><span>{index === 0 ? 'Mais recente' : index === 1 ? 'Anterior' : 'Consulta anterior'}</span><small>{timestamp(entry.checkedAt, timeZone)}</small>{stays && entry.query && <small>{dateBR(entry.query.checkin)} a {dateBR(entry.query.checkout)} · {entry.query.adults} {entry.query.adults === 1 ? 'adulto' : 'adultos'}</small>}</td><td>{displayPrice(lowestPrice(entry.offers, amount))}</td><td>{entry.offers.length}</td></tr>)}
      </tbody></table></div>
      {!previous ? <p className="price-history__note">Uma nova consulta salva permitirá comparar os preços.</p> : !comparable ? <p className="price-history__note">As duas consultas mais recentes têm datas ou quantidade de pessoas diferentes, ou faltam esses dados. Não é possível comparar os preços com segurança.</p> : <>
        <p className="price-history__change">{change == null ? 'Não foi possível comparar os menores preços: verifique os valores e as moedas.' : change === 0 ? 'Menor preço sem alteração' : `${change > 0 ? 'Aumento' : 'Redução'} de ${money(Math.abs(change), latestPrice!.currency)} no menor preço`} <span>entre as duas consultas mais recentes.</span></p>
        {matches && <p className="price-history__note">{matches.total ? `${matches.total} ${matches.total === 1 ? 'opção identificada' : 'opções identificadas'} pelo mesmo link: ${matches.same} sem alteração, ${matches.increased} com aumento e ${matches.decreased} com redução.` : 'Nenhuma opção com preço comparável foi identificada pelo mesmo link.'}</p>}
      </>}
    </>}
  </section>;
}

export default function PriceHistory({ flights, stays, loading, error, fallbackStayQuery, timeZone }: { flights: FlightSnapshot[]; stays: StaySnapshot[]; loading: boolean; error?: string; fallbackStayQuery?: StayQuery; timeZone?: string }) {
  const flightEntries = flights.map(item => ({ id: item.id, checkedAt: item.checked_at, offers: item.offers }));
  const stayEntries = stays.map(item => ({ ...item, query: item.query ?? fallbackStayQuery }));
  const comparableStays = stayEntries.length < 2 || sameStayPeriod(stayEntries[0].query, stayEntries[1].query);
  return <section className="price-history glass" aria-labelledby="price-history-title">
    <div className="price-history__heading"><div><h3 id="price-history-title">Histórico e comparação de preços</h3><p>Resultados salvos nesta viagem, sem novas consultas.</p></div><CalendarDays size={19} aria-hidden="true"/></div>
    <History title="Voos" entries={flightEntries} amount={flightAmount} timeZone={timeZone}/>
    {loading ? <p className="price-history__note">Carregando histórico de hospedagens...</p> : error ? <p className="price-history__note" role="status">Não foi possível carregar o histórico de hospedagens. Feche e abra a viagem para tentar novamente.</p> : <History title="Hospedagens" entries={stayEntries} amount={stayAmount} comparable={comparableStays} stays timeZone={timeZone}/>}
    <p className="price-history__disclaimer">Os menores preços podem ser de opções diferentes. Valores e disponibilidade podem mudar; confirme taxas e condições no fornecedor.</p>
  </section>;
}
