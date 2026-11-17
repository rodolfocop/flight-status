'use server';
import { redirect } from 'next/navigation';
import { userClient } from '@/lib/supabase/server';
export async function signIn(_: string | null, form: FormData): Promise<string | null> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return 'Preencha seu e-mail e sua senha.';
  try {
    const supabase = await userClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user || !process.env.OWNER_USER_ID || data.user.id !== process.env.OWNER_USER_ID) {
      await supabase.auth.signOut();
      return 'Não foi possível entrar. Confira seus dados e tente novamente.';
    }
  } catch { return 'Não foi possível entrar. Verifique a configuração do serviço.'; }
  redirect('/dashboard');
}
export async function signOut() {
  try { const supabase = await userClient(); await supabase.auth.signOut(); } catch { /* no session */ }
  redirect('/login');
}
