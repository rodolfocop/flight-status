'use client';
import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';

type Quota = { provider: 'flights' | 'stays'; used: number | null; configured: boolean; nextResetAt?: string | null };
export default function QuotaRenewal({ quotas, onSaved }: { quotas: Quota[]; onSaved: () => void }) {
  const [provider, setProvider] = useState<'flights' | 'stays'>('flights');
  const [when, setWhen] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const utc = `${when.length === 16 ? `${when}:00` : when}Z`;
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/quota/renewal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, resetAt: utc }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível salvar a renovação.');
      setWhen(''); setMessage('Horário salvo. O contador será renovado uma vez, após esse instante.'); onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a renovação.'); }
    finally { setSaving(false); }
  }
  async function remove(kind: 'flights' | 'stays') {
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/quota/renewal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: kind, resetAt: null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível remover a renovação.');
      setMessage('Horário removido. O contador não será reiniciado por estimativa.'); onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível remover a renovação.'); }
    finally { setSaving(false); }
  }
  const label = (kind: Quota['provider']) => kind === 'flights' ? 'Voos' : 'Hospedagens';
  return <details className="time-zone-panel glass"><summary><ShieldCheck size={18} aria-hidden="true"/><span>Renovação das franquias</span></summary>
    <div className="quota-renewal">
      <p>O contador não reinicia por estimativa. Após atingir o limite, as consultas ficam bloqueadas até o horário de renovação confirmado.</p>
      <ul>{(['flights', 'stays'] as const).map(kind => { const quota = quotas.find(item => item.provider === kind); return <li key={kind}><strong>{label(kind)}:</strong> {quota?.nextResetAt ? <>renovação registrada para {new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(quota.nextResetAt))} UTC <button className="text-action" type="button" disabled={saving} onClick={() => { void remove(kind); }}>Remover horário de {label(kind).toLocaleLowerCase('pt-BR')}</button></> : 'horário de renovação não confirmado'}</li>; })}</ul>
      <p>Consulte <a href="https://rapidapi.com/developer/billing/subscriptions-and-usage" target="_blank" rel="noopener noreferrer">assinaturas e uso na RapidAPI</a>. Informe abaixo somente uma data e hora exatas confirmadas pelo fornecedor; o horário é UTC, não o fuso da viagem. Uma confirmação vale para uma única renovação.</p>
      <form onSubmit={save} className="quota-renewal__form"><label className="field"><span>Franquia</span><select value={provider} onChange={event => setProvider(event.target.value as 'flights' | 'stays')}><option value="flights">Voos</option><option value="stays">Hospedagens</option></select></label><label className="field"><span>Próxima renovação confirmada (UTC)</span><input type="datetime-local" step="1" value={when} onChange={event => setWhen(event.target.value)} required/></label><button className="primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar renovação'}</button></form>
      {message && <p role="status" className="quota-renewal__message">{message}</p>}
      <p>Consultas feitas fora deste aplicativo não entram nessa contagem. Confira o consumo total na RapidAPI.</p>
    </div>
  </details>;
}
