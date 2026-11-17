'use client';
import { useState, type FormEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';
import type { FlightOffer } from '@/lib/travel/schema';
export default function LocalAssistant({ offers, tripName }: { offers: FlightOffer[]; tripName?: string }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [pending, setPending] = useState(false);
  async function ask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setPending(true); setAnswer('');
    try {
      const result = await fetch('/api/local-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, context: JSON.stringify(offers.slice(0, 8)) }) });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || 'Não foi possível usar o assistente.');
      setAnswer(data.answer);
    } catch (error) { setAnswer(error instanceof Error ? error.message : 'Não foi possível usar o assistente.'); } finally { setPending(false); }
  }
  return <section className="ai-panel glass assistant"><Sparkles size={19} aria-hidden="true"/><div><h2>Seu assistente</h2><p>{tripName ? `Ao perguntar, até 8 voos da consulta selecionada para ${tripName} serão enviados ao provedor configurado.` : offers.length ? 'Ao perguntar, até 8 voos da última busca serão enviados ao provedor configurado.' : 'Configure um provedor em configurações locais. Abra uma viagem ou busque voos para incluir ofertas na pergunta.'}</p><form onSubmit={ask}><label className="sr-only" htmlFor="ai-question">Pergunta para o assistente</label><textarea id="ai-question" value={question} onChange={e => setQuestion(e.target.value)} maxLength={1200} placeholder="O que você quer saber?" required/><button className="secondary" disabled={pending}><Send size={14} aria-hidden="true"/> {pending ? 'Consultando...' : 'Perguntar'}</button></form>{answer && <div className="assistant-answer" role="status">{answer}</div>}</div></section>;
}
