import 'server-only';
import { validTimeZone } from './time-zone';
import { TravelError } from './provider';
import type { userClient } from '../supabase/server';

type Auth = { client: Awaited<ReturnType<typeof userClient>>; user: { id: string } } | null;
export async function getUserTimeZone(local: boolean, auth: Auth): Promise<string | null> {
  if (local) return (await import('../local/store')).getTimeZone();
  if (!auth) return null;
  const { data, error } = await auth.client.from('user_preferences').select('time_zone').eq('user_id', auth.user.id).maybeSingle();
  if (error) throw new TravelError('Não foi possível ler o fuso horário da conta.', 503);
  return validTimeZone(data?.time_zone) ? data.time_zone : null;
}
export async function requireUserTimeZone(local: boolean, auth: Auth): Promise<string> {
  const zone = await getUserTimeZone(local, auth);
  if (!zone) throw new TravelError('Configure o fuso horário antes de pesquisar ou acompanhar viagens.', 503);
  return zone;
}
