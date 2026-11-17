import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || '3013');
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT deve ser um número entre 1024 e 65535.');
const secret = randomBytes(32).toString('hex');
const next = resolve(project, 'node_modules/next/dist/bin/next');
// The container publishes its port only on the host loopback via Compose.
const hostname = process.env.DESTINO_CONTAINER === '1' ? '0.0.0.0' : '127.0.0.1';
const child = spawn(process.execPath, [next, 'dev', '--hostname', hostname, '--port', String(port)], {
  cwd: project, stdio: 'inherit', env: { ...process.env, DESTINO_LOCAL: '1', LOCAL_MONITOR_SECRET: secret },
});
let stopped = false;
const shutdown = new AbortController();
const stop = () => { stopped = true; shutdown.abort(); child.kill('SIGTERM'); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', code => { stopped = true; shutdown.abort(); process.exitCode = code ?? 0; });
console.log(`Destino Certo estará disponível em http://127.0.0.1:${port}`);
async function monitor() {
  if (stopped) return;
  try {
    // Batches are small to respect the provider's time limits and quota.
    for (let i = 0; i < 14 && !stopped; i++) {
      const response = await fetch(`http://127.0.0.1:${port}/api/local-monitor`, { method: 'POST', headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(240000) });
      if (!response.ok) break;
      const result = await response.json();
      if (!result.configured || result.attempted < 3) break;
    }
  } catch { /* Server may still be starting or the computer may be offline. */ }
}
try {
  await delay(8000, undefined, { signal: shutdown.signal });
  await monitor();
  while (!stopped) { await delay(30 * 60 * 1000, undefined, { signal: shutdown.signal }); await monitor(); }
} catch (error) { if (error.name !== 'AbortError') throw error; }
