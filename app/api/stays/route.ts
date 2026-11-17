import { NextResponse } from 'next/server';
import { owner, adminClient } from '@/lib/supabase/server';
import { staySchema } from '@/lib/travel/schema';
import { stays, TravelError } from '@/lib/travel/provider';
import { fail, validRequest } from '@/lib/travel/http';
import { localRequest } from '@/lib/local/mode';
import { dateInZone } from '@/lib/travel/time-zone';
import { requireUserTimeZone } from '@/lib/travel/user-time-zone';
export async function GET(request: Request) {
  try {
    const local = localRequest(request);
    const auth = local ? null : await owner();
    if (!local && !auth) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const searchId = params.get('searchId');
    if (local && searchId) {
      const store = await import('@/lib/local/store');
      const search = store.getSearch(searchId);
      if (!search) return NextResponse.json({ error: 'Pesquisa não encontrada.' }, { status: 404 });
      const query = staySchema.safeParse({ destination: search.destination_name, checkin: search.departure_date, checkout: search.return_date, adults: search.passengers });
      const snapshots = store.listTripStays(searchId, query.success ? JSON.stringify(query.data) : null);
      return NextResponse.json(snapshots.length ? { ...snapshots[0], snapshots, found: true } : { found: false, snapshots: [] });
    }
    const parsed = staySchema.safeParse({ destination: params.get('destination'), checkin: params.get('checkin'), checkout: params.get('checkout'), adults: params.get('adults') });
    if (!parsed.success) return NextResponse.json({ error: 'Confira o destino e as datas da hospedagem.' }, { status: 400 });
    const queryKey = JSON.stringify(parsed.data);
    if (local) {
      const snapshots = (await import('@/lib/local/store')).listStays(queryKey);
      return NextResponse.json(snapshots.length ? { ...snapshots[0], snapshots, found: true } : { found: false, snapshots: [] });
    }
    const { data, error } = await auth!.client.from('stay_snapshots').select('id,offers,checked_at').eq('query_key', queryKey).order('checked_at', { ascending: false });
    if (error) throw error;
    const snapshots = data.map(row => ({ id: row.id, offers: row.offers, checkedAt: row.checked_at }));
    return NextResponse.json(snapshots.length ? { ...snapshots[0], snapshots, found: true } : { found: false, snapshots: [] });
  } catch (error) { return fail(error); }
}
export async function POST(request: Request) {
  try {
    if (!validRequest(request)) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
    const local = localRequest(request);
    const auth = local ? null : await owner();
    if (!local && !auth) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const body = await request.json();
    const parsed = staySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Confira o destino e as datas da hospedagem.' }, { status: 400 });
    if (parsed.data.checkin < dateInZone(new Date(), await requireUserTimeZone(local, auth))) return NextResponse.json({ error: 'A data de entrada já passou no seu fuso horário.' }, { status: 400 });
    let searchId: string | undefined;
    if (local && body.searchId) {
      if (typeof body.searchId !== 'string') return NextResponse.json({ error: 'Pesquisa inválida.' }, { status: 400 });
      const search = (await import('@/lib/local/store')).getSearch(body.searchId);
      if (!search) return NextResponse.json({ error: 'Pesquisa não encontrada.' }, { status: 404 });
      if (String(search.destination_name).trim().toLocaleLowerCase('pt-BR') === parsed.data.destination.toLocaleLowerCase('pt-BR')) searchId = body.searchId;
    }
    const queryKey = JSON.stringify(parsed.data);
    try {
      const offers = await stays(parsed.data);
      const checkedAt = new Date().toISOString();
      if (local) (await import('@/lib/local/store')).saveStays(queryKey, offers, checkedAt, searchId);
      else if (auth) {
        const { error } = await adminClient().from('stay_snapshots').insert({ user_id: auth.user.id, query_key: queryKey, offers, checked_at: checkedAt });
        if (error) throw error;
      }
      return NextResponse.json({ offers, checkedAt, cached: false });
    } catch (error) {
      if (!(error instanceof TravelError) || error.status !== 429) throw error;
      if (local) {
        const data = (await import('@/lib/local/store')).latestStays(queryKey);
        if (!data) throw error;
        return NextResponse.json({ ...data, cached: true });
      }
      if (!auth) throw error;
      const { data } = await auth.client.from('stay_snapshots').select('offers,checked_at').eq('query_key', queryKey).order('checked_at', { ascending: false }).limit(1).maybeSingle();
      if (!data) throw error;
      return NextResponse.json({ offers: data.offers, checkedAt: data.checked_at, cached: true });
    }
  } catch (error) { return fail(error); }
}
