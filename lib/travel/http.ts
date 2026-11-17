import { NextResponse } from 'next/server';
import { TravelError } from './provider';
export function fail(error: unknown) {
  if (error instanceof TravelError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('Falha na operação de viagem', error instanceof Error ? error.name : 'unknown');
  return NextResponse.json({ error: 'Não foi possível concluir a operação. Tente novamente.' }, { status: 500 });
}
export function validRequest(request: Request) {
  const origin = request.headers.get('origin');
  if (!request.headers.get('content-type')?.includes('application/json')) return false;
  if (!origin) return true;
  try {
    const source = new URL(origin);
    return ['http:', 'https:'].includes(source.protocol) && source.host === request.headers.get('host');
  } catch { return false; }
}
