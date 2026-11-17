import { NextResponse } from 'next/server';
import { localRequest } from '@/lib/local/mode';
import { fail } from '@/lib/travel/http';

export async function GET(request: Request) {
  if (!localRequest(request)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  try {
    const { listStayHistory } = await import('@/lib/local/store');
    return NextResponse.json({ snapshots: listStayHistory() });
  } catch (error) { return fail(error); }
}
