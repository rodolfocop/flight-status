import { NextResponse } from 'next/server';
import { adminClient, owner } from '@/lib/supabase/server';
import { localRequest } from '@/lib/local/mode';
import { fail, validRequest } from '@/lib/travel/http';

export async function POST(request: Request) {
  try {
    if (!validRequest(request)) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
    const local = localRequest(request);
    if (!local && !await owner()) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const body = await request.json();
    if (!['flights', 'stays'].includes(body.provider)) return NextResponse.json({ error: 'Escolha a franquia.' }, { status: 400 });
    let resetAt: string | null = null;
    if (body.resetAt !== null) {
      if (typeof body.resetAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(body.resetAt)) return NextResponse.json({ error: 'Informe a data e hora UTC confirmadas.' }, { status: 400 });
      const date = new Date(body.resetAt);
      if (!Number.isFinite(date.getTime()) || date.toISOString() !== body.resetAt.replace('Z', '.000Z') || date.getTime() <= Date.now()) return NextResponse.json({ error: 'A renovação deve ser uma data futura válida em UTC.' }, { status: 400 });
      resetAt = date.toISOString();
    }
    if (local) {
      const store = await import('@/lib/local/store');
      store.setQuotaReset(body.provider, resetAt);
      return NextResponse.json({ ...store.quotaStatus(body.provider) });
    }
    const admin = adminClient();
    const { error: statusError } = await admin.rpc('quota_guard_status', { p_provider: body.provider });
    if (statusError) throw statusError;
    const { error } = await admin.from('quota_guard').update({ next_reset_at: resetAt }).eq('provider', body.provider);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return fail(error); }
}
