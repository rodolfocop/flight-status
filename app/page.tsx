import { redirect } from 'next/navigation';
import { owner } from '@/lib/supabase/server';
import { localPage } from '@/lib/local/mode';
export const dynamic = 'force-dynamic';
export default async function Home() { redirect(await localPage() || await owner() ? '/dashboard' : '/login'); }
