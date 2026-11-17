import { redirect } from 'next/navigation';
import { owner } from '@/lib/supabase/server';
import Dashboard from '@/components/dashboard';
import { localPage } from '@/lib/local/mode';
export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  if (await localPage()) return <Dashboard local />;
  const auth = await owner();
  if (!auth) redirect('/login');
  return <Dashboard />;
}
