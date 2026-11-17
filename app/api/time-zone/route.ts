import { NextResponse } from 'next/server';
import { owner } from '@/lib/supabase/server';
import { localRequest } from '@/lib/local/mode';
import { fail, validRequest } from '@/lib/travel/http';
import { validTimeZone } from '@/lib/travel/time-zone';
import { getUserTimeZone } from '@/lib/travel/user-time-zone';

export async function GET(request: Request) {
  try {
    const local = localRequest(request), auth = local ? null : await owner();
    if (!local && !auth) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    return NextResponse.json({ timeZone: await getUserTimeZone(local, auth) });
  } catch (error) { return fail(error); }
}
export async function POST(request: Request) {
  try {
    if (!validRequest(request)) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
    const local = localRequest(request), auth = local ? null : await owner();
    if (!local && !auth) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const body = await request.json();
    if (!validTimeZone(body.timeZone) || (body.onlyIfMissing != null && typeof body.onlyIfMissing !== 'boolean')) return NextResponse.json({ error: 'Informe um fuso horário válido.' }, { status: 400 });
    if (local) {
      const store = await import('@/lib/local/store');
      return NextResponse.json({ timeZone: store.saveTimeZone(body.timeZone, body.onlyIfMissing === true) });
    }
    if (!auth) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const { error } = await auth.client.from('user_preferences').upsert({ user_id: auth.user.id, time_zone: body.timeZone }, { onConflict: 'user_id', ignoreDuplicates: body.onlyIfMissing === true });
    if (error) throw error;
    return NextResponse.json({ timeZone: await getUserTimeZone(false, auth) });
  } catch (error) { return fail(error); }
}
