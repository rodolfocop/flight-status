import { NextResponse } from 'next/server';
import { owner, adminClient } from '@/lib/supabase/server';
import { cycleStart } from '@/lib/travel/quota';
import { fail } from '@/lib/travel/http';
import { localRequest } from '@/lib/local/mode';
export async function GET(request: Request) {
  try {
    const local = localRequest(request);
    if (!local && !await owner()) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const settings = local ? (await import('@/lib/local/settings')).loadSettings() : null;
    const values = await Promise.all((['flights', 'stays'] as const).map(async provider => {
      const anchor = provider === 'flights' ? (settings?.flightsCycle || process.env.RAPIDAPI_FLIGHTS_CYCLE_ANCHOR) : (settings?.staysCycle || process.env.RAPIDAPI_STAYS_CYCLE_ANCHOR);
      let configured = !!anchor && !!(settings?.rapidApiKey || process.env.RAPIDAPI_KEY);
      try { if (anchor) cycleStart(anchor); } catch { configured = false; }
      if (local) { const status = (await import('@/lib/local/store')).quotaStatus(provider); return { provider, configured, used: configured ? status.used : null, nextResetAt: status.nextResetAt, cycle: null }; }
      const { data, error } = await adminClient().rpc('quota_guard_status', { p_provider: provider });
      if (error) throw error;
      return { provider, configured, used: configured ? (data?.[0]?.used ?? 0) : null, nextResetAt: data?.[0]?.next_reset_at ?? null, cycle: null };
    }));
    return NextResponse.json({ quotas: values });
  } catch (error) { return fail(error); }
}
