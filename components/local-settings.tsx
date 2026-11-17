'use client';
import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import { KeyRound, Settings2 } from 'lucide-react';
import { dateInZone } from '@/lib/travel/time-zone';
type State = { rapidApiKeyConfigured: boolean; flightsCycle: string; staysCycle: string; aiProvider: string; aiModel: string; aiBaseUrl: string; aiApiKeyConfigured: boolean };
const empty: State = { rapidApiKeyConfigured: false, flightsCycle: '', staysCycle: '', aiProvider: 'none', aiModel: '', aiBaseUrl: '', aiApiKeyConfigured: false };
const subscribe = () => () => {};
const clientReady = () => true;
const serverNotReady = () => false;
export default function LocalSettings({ onSaved, timeZone }: { onSaved: () => void; timeZone: string | null }) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverNotReady);
  const [config, setConfig] = useState<State>(empty);
  const [rapidKey, setRapidKey] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const maxCycleDate = ready && timeZone ? dateInZone(new Date(), timeZone) : undefined;
  const loadSettings = useCallback(() => fetch('/api/local-settings')
    .then(response => { if (!response.ok) throw new Error(); return response.json(); })
    .then(data => { setConfig(data); setLoaded(true); })
    .catch(() => setLoadError(true)), []);
  useEffect(() => { void loadSettings(); }, [loadSettings]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setMessage('');
    try {
      const result = await fetch('/api/local-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rapidApiKey: rapidKey, flightsCycle: config.flightsCycle, staysCycle: config.staysCycle, aiProvider: config.aiProvider, aiModel: config.aiModel, aiBaseUrl: config.aiBaseUrl, aiApiKey: aiKey }) });
      if (!result.ok) { const body = await result.json().catch(() => ({})); throw new Error(body.error || 'Confira os dados e tente novamente.'); }
      setConfig(await result.json()); setRapidKey(''); setAiKey(''); setMessage('Configurações salvas neste computador.'); onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar.'); } finally { setSaving(false); }
  }
  async function removeKey(kind: 'rapid' | 'ai') {
    setSaving(true); setMessage('');
    try {
      const result = await fetch('/api/local-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(kind === 'rapid' ? { clearRapidApiKey: true } : { clearAiApiKey: true }) });
      if (!result.ok) throw new Error();
      setConfig(await result.json()); setMessage('Chave removida deste computador.'); onSaved();
    } catch { setMessage('Não foi possível remover a chave.'); } finally { setSaving(false); }
  }
  return <details className="settings-panel glass" id="configuracoes"><summary><Settings2 size={19}/> Configurações locais <span>Dados de viagem e inteligência artificial</span></summary>{loadError ? <div className="settings-load" role="status"><p>Não foi possível carregar as configurações.</p><button type="button" className="secondary" onClick={() => { setLoadError(false); void loadSettings(); }}>Tentar novamente</button></div> : !loaded || !ready ? <p className="settings-load" role="status">Carregando configurações...</p> : <form onSubmit={save} className="settings-form">
    <div><h3>Dados de viagem</h3><p>Cadastre sua própria chave gratuita da RapidAPI. Inscreva-se separadamente nos serviços de voos e hospedagens da FlightPowers. Informe abaixo a data de início de cada assinatura, não as datas da viagem.</p></div>
    <label className="field"><span>Chave RapidAPI</span><span className="input-wrap"><KeyRound size={17}/><input type="password" autoComplete="off" value={rapidKey} onChange={e => setRapidKey(e.target.value)} placeholder={config.rapidApiKeyConfigured ? 'Chave já salva' : 'Cole sua chave aqui'}/></span></label>
    {config.rapidApiKeyConfigured && <button type="button" className="settings-remove" disabled={saving} onClick={() => removeKey('rapid')}>Remover chave RapidAPI</button>}
    <label className="field"><span>Início do ciclo de voos</span><input type="date" max={maxCycleDate} value={config.flightsCycle} onChange={e => setConfig({ ...config, flightsCycle: e.target.value })}/></label>
    <label className="field"><span>Início do ciclo de hospedagens</span><input type="date" max={maxCycleDate} value={config.staysCycle} onChange={e => setConfig({ ...config, staysCycle: e.target.value })}/></label>
    <div><h3>Assistente de IA</h3><p>Escolha um modelo local ou serviço de sua preferência. Sua chave fica armazenada somente neste computador. As informações só serão enviadas ao fornecedor quando você pedir ajuda à IA. APIs externas podem cobrar pelo uso.</p></div>
    <label className="field"><span>Fornecedor</span><select value={config.aiProvider} onChange={e => setConfig({ ...config, aiProvider: e.target.value })}><option value="none">Desativado</option><option value="ollama">Ollama local</option><option value="openai-compatible">API compatível com OpenAI</option><option value="anthropic">Claude (API Anthropic)</option><option value="gemini">Gemini (API Google)</option></select></label>
    {config.aiProvider !== 'none' && <label className="field"><span>Nome do modelo</span><input value={config.aiModel} onChange={e => setConfig({ ...config, aiModel: e.target.value })} placeholder={config.aiProvider === 'ollama' ? 'ex.: llama3.2' : 'Nome do modelo escolhido'}/></label>}
    {config.aiProvider === 'openai-compatible' && <label className="field"><span>Endereço base HTTPS da API</span><input type="url" value={config.aiBaseUrl} onChange={e => setConfig({ ...config, aiBaseUrl: e.target.value })} placeholder="https://api.exemplo.com/v1"/></label>}
    {config.aiProvider !== 'none' && config.aiProvider !== 'ollama' && <label className="field"><span>Chave da IA</span><input type="password" autoComplete="off" value={aiKey} onChange={e => setAiKey(e.target.value)} placeholder={config.aiApiKeyConfigured ? 'Chave já salva' : 'Cole sua chave aqui'}/></label>}
    {config.aiApiKeyConfigured && <button type="button" className="settings-remove" disabled={saving} onClick={() => removeKey('ai')}>Remover chave de IA</button>}
    {!timeZone && <p className="settings-message">Configure o fuso horário para salvar as datas dos ciclos.</p>}
    {message && <p className="settings-message" role="status">{message}</p>}<button className="primary" disabled={saving || !ready || !timeZone}>{!ready ? 'Carregando configurações...' : saving ? 'Salvando...' : 'Salvar configurações'}</button>
  </form>}</details>;
}
