import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export async function userClient() {
  const config = publicConfig();
  if (!config) throw new Error('Autenticação ainda não configurada.');
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items) => {
        try { items.forEach(({ name, value, options }) => jar.set(name, value, options)); }
        catch { /* Server Components cannot write cookies; proxy refreshes the session. */ }
      },
    },
  });
}

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Banco de dados ainda não configurado.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function owner() {
  const ownerId = process.env.OWNER_USER_ID;
  if (!publicConfig() || !ownerId) return null;
  const client = await userClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || user.id !== ownerId) return null;
  return { client, user };
}
