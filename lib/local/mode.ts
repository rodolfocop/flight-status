import 'server-only';
import { headers } from 'next/headers';
function allowed(host: string | null, forwarded: string | null) {
  return process.env.NODE_ENV === 'development' && process.env.DESTINO_LOCAL === '1' && !!host && (!forwarded || forwarded === host) && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host);
}
export async function localPage() {
  const h = await headers();
  return allowed(h.get('host'), h.get('x-forwarded-host'));
}
export function localRequest(request: Request) {
  return allowed(request.headers.get('host'), request.headers.get('x-forwarded-host'));
}
