import { redirect } from 'next/navigation';
import { owner, publicConfig } from '@/lib/supabase/server';
import LoginForm from './form';
export const dynamic = 'force-dynamic';
export default async function LoginPage() {
  if (await owner()) redirect('/dashboard');
  return <LoginForm configured={!!publicConfig() && !!process.env.OWNER_USER_ID} />;
}
