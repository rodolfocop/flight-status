import { NextResponse } from 'next/server';
import { localRequest } from '@/lib/local/mode';
import { validRequest } from '@/lib/travel/http';
import { dateInZone } from '@/lib/travel/time-zone';
export async function GET(request: Request) {
  if (!localRequest(request)) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  try { return NextResponse.json((await import('@/lib/local/settings')).publicSettings()); }
  catch { return NextResponse.json({ error: 'Não foi possível ler as configurações locais.' }, { status: 500 }); }
}
export async function POST(request: Request) {
  if (!localRequest(request)) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!validRequest(request)) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  try {
    const settings = await import('@/lib/local/settings');
    const parsed = settings.settingsSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Confira os dados informados.' }, { status: 400 });
    if (parsed.data.flightsCycle || parsed.data.staysCycle) {
      const zone = (await import('@/lib/local/store')).getTimeZone();
      if (!zone) return NextResponse.json({ error: 'Configure o fuso horário antes de informar as datas dos ciclos.' }, { status: 503 });
      const today = dateInZone(new Date(), zone);
      if ([parsed.data.flightsCycle, parsed.data.staysCycle].some(date => date && date > today)) return NextResponse.json({ error: 'O início do ciclo não pode estar no futuro no seu fuso horário.' }, { status: 400 });
    }
    settings.saveSettings(parsed.data);
    return NextResponse.json(settings.publicSettings());
  } catch { return NextResponse.json({ error: 'Não foi possível salvar as configurações locais.' }, { status: 500 }); }
}
