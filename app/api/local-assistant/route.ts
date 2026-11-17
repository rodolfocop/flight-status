import { NextResponse } from 'next/server';
import { z } from 'zod';
import { localRequest } from '@/lib/local/mode';
import { validRequest } from '@/lib/travel/http';
const schema = z.object({ question: z.string().trim().min(1).max(1200), context: z.string().max(12000).optional() });
const instruction = 'Você ajuda uma pessoa a planejar viagens. Use somente os dados de ofertas fornecidos. Não invente preços, horários, disponibilidade nem links. Se faltarem dados, diga isso. Responda de modo breve em português.';
export async function POST(request: Request) {
  if (!localRequest(request)) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!validRequest(request)) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Escreva uma pergunta válida.' }, { status: 400 });
  const settings = (await import('@/lib/local/settings')).loadSettings();
  const { aiProvider: provider, aiModel: model, aiApiKey: key, aiBaseUrl } = settings;
  if (!provider || provider === 'none' || !model) return NextResponse.json({ error: 'Configure o assistente e escolha um modelo nas configurações locais.' }, { status: 503 });
  if (provider !== 'ollama' && !key) return NextResponse.json({ error: 'Configure a chave do fornecedor de IA.' }, { status: 503 });
  const content = `${body.data.question}\n\nDados de ofertas fornecidos pelo aplicativo (podem estar vazios):\n${body.data.context || 'Nenhuma oferta fornecida.'}`;
  let url: string;
  let headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let payload: object;
  if (provider === 'ollama') {
    url = process.env.DESTINO_CONTAINER === '1' ? 'http://host.docker.internal:11434/api/chat' : 'http://127.0.0.1:11434/api/chat';
    payload = { model, stream: false, messages: [{ role: 'system', content: instruction }, { role: 'user', content }] };
  } else if (provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { ...headers, 'x-api-key': key!, 'anthropic-version': '2023-06-01' };
    payload = { model, max_tokens: 600, system: instruction, messages: [{ role: 'user', content }] };
  } else if (provider === 'gemini') {
    if (!/^[A-Za-z0-9._-]+$/.test(model)) return NextResponse.json({ error: 'Nome de modelo inválido.' }, { status: 400 });
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    headers = { ...headers, 'x-goog-api-key': key! };
    payload = { systemInstruction: { parts: [{ text: instruction }] }, contents: [{ role: 'user', parts: [{ text: content }] }], generationConfig: { maxOutputTokens: 600 } };
  } else {
    try {
      const base = new URL(aiBaseUrl || '');
      if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(base.hostname) || base.hostname.includes(':') || base.hostname.endsWith('.local')) throw new Error();
      url = `${base.toString().replace(/\/$/, '')}/chat/completions`;
    } catch { return NextResponse.json({ error: 'Informe uma URL HTTPS válida para a API compatível.' }, { status: 400 }); }
    headers = { ...headers, authorization: `Bearer ${key}` };
    payload = { model, max_tokens: 600, messages: [{ role: 'system', content: instruction }, { role: 'user', content }] };
  }
  try {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(90000), redirect: 'error', cache: 'no-store' });
    if (!response.ok) return NextResponse.json({ error: 'O fornecedor de IA recusou a solicitação. Verifique modelo, chave e acesso.' }, { status: 502 });
    const data = await response.json();
    const answer = provider === 'ollama' ? data.message?.content : provider === 'anthropic' ? data.content?.filter((x: {type: string}) => x.type === 'text').map((x: {text: string}) => x.text).join('\n') : provider === 'gemini' ? data.candidates?.[0]?.content?.parts?.map((x: {text?: string}) => x.text || '').join('') : data.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) throw new Error('Resposta vazia');
    return NextResponse.json({ answer: answer.slice(0, 10000), provider });
  } catch { return NextResponse.json({ error: provider === 'ollama' ? 'Não foi possível acessar o Ollama local. Verifique se ele está aberto e se o modelo foi baixado.' : 'Não foi possível acessar o fornecedor de IA.' }, { status: 502 }); }
}
