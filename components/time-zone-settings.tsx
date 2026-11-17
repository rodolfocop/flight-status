'use client';
import { useState, type FormEvent } from 'react';
import { Globe2 } from 'lucide-react';
import { validTimeZone } from '@/lib/travel/time-zone';

export default function TimeZoneSettings({ timeZone, error, loading, onSaved, onRetry }: { timeZone: string | null; error: string; loading: boolean; onSaved: (zone: string) => void; onRetry: () => void }) {
  const [draft, setDraft] = useState(timeZone || '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const zone = draft.trim();
    if (!validTimeZone(zone)) { setMessage('Informe um fuso válido, como America/Cuiaba.'); return; }
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/time-zone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeZone: zone }) });
      const result = await response.json();
      if (!response.ok || !validTimeZone(result.timeZone)) throw new Error(result.error || 'Não foi possível salvar o fuso horário.');
      onSaved(result.timeZone); setMessage('Fuso horário atualizado.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Não foi possível salvar o fuso horário.'); }
    finally { setSaving(false); }
  }
  return <details className="time-zone-panel glass" open={!!error || undefined}>
    <summary><Globe2 size={18} aria-hidden="true"/><span>Fuso horário</span><span className="time-zone-panel__current">{loading ? 'Identificando...' : timeZone || 'Não configurado'}</span></summary>
    <form className="time-zone-form" onSubmit={save}>
      <p>Datas e acompanhamento usam este fuso. Ele fica salvo para sua conta ou instalação local e não muda ao trocar de dispositivo.</p>
      {error && <p className="time-zone-form__error" role="status">{error} <button type="button" className="text-action" onClick={onRetry}>Tentar identificar novamente</button></p>}
      <label className="field"><span>Fuso horário da conta</span><input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Ex.: America/Cuiaba" autoComplete="off" required/></label>
      <div className="time-zone-form__actions"><button type="button" className="secondary" onClick={() => { const zone = Intl.DateTimeFormat().resolvedOptions().timeZone; if (validTimeZone(zone)) { setDraft(zone); setMessage('Confira o fuso detectado e clique em salvar.'); } else setMessage('Não foi possível identificar o fuso deste dispositivo.'); }}>Usar fuso deste dispositivo</button><button className="primary" disabled={saving || loading}>{saving ? 'Salvando...' : 'Salvar fuso'}</button></div>
      {message && <p className="time-zone-form__message" role="status">{message}</p>}
    </form>
  </details>;
}
