import { NextResponse } from 'next/server';
import { owner } from '@/lib/supabase/server';
import { fail, validRequest } from '@/lib/travel/http';
import { localRequest } from '@/lib/local/mode';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!validRequest(request)) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
    const local = localRequest(request);
    const auth = local ? null : await owner();
    if (!local && !auth) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const body = await request.json();
    if (typeof body.active !== 'boolean') return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    const { id } = await context.params;
    if (local) {
      const { setActive } = await import('@/lib/local/store');
      return setActive(id, body.active) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Pesquisa não encontrada.' }, { status: 404 });
    }
    if (!auth) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const { data, error } = await auth.client.from('saved_searches').update({ active: body.active }).eq('id', id).eq('user_id', auth.user.id).select('id').maybeSingle();
    if (error) throw error;
    return data ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Pesquisa não encontrada.' }, { status: 404 });
  } catch (error) { return fail(error); }
}
