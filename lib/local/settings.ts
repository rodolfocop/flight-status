import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { z } from 'zod';
const provider = z.enum(['none', 'ollama', 'openai-compatible', 'anthropic', 'gemini']);
export const settingsSchema = z.object({
  rapidApiKey: z.string().max(500).optional(),
  flightsCycle: z.union([z.iso.date(), z.literal('')]).optional(),
  staysCycle: z.union([z.iso.date(), z.literal('')]).optional(),
  aiProvider: provider.optional(),
  aiModel: z.string().trim().max(150).optional(),
  aiBaseUrl: z.string().trim().max(500).optional(),
  aiApiKey: z.string().max(500).optional(),
  clearRapidApiKey: z.boolean().optional(),
  clearAiApiKey: z.boolean().optional(),
});
export type Settings = z.infer<typeof settingsSchema>;
const directory = () => process.env.DESTINO_DATA_DIR || join(process.cwd(), '.destino-certo');
const path = () => join(directory(), 'settings.json');
export function loadSettings(): Settings {
  if (!existsSync(path())) return {};
  try { return settingsSchema.parse(JSON.parse(readFileSync(path(), 'utf8'))); }
  catch { throw new Error('Configuração local inválida.'); }
}
export function saveSettings(update: Settings) {
  const old = loadSettings();
  const { clearRapidApiKey, clearAiApiKey, ...values } = update;
  const merged = { ...old, ...values };
  // Blank credentials leave existing ones intact; never return the values to the browser.
  if (!update.rapidApiKey) merged.rapidApiKey = old.rapidApiKey;
  if (!update.aiApiKey) merged.aiApiKey = update.aiProvider && update.aiProvider !== old.aiProvider ? undefined : old.aiApiKey;
  if (clearRapidApiKey) delete merged.rapidApiKey;
  if (clearAiApiKey) delete merged.aiApiKey;
  mkdirSync(directory(), { recursive: true, mode: 0o700 });
  const tmp = join(directory(), `.settings-${randomUUID()}.tmp`);
  writeFileSync(tmp, JSON.stringify(merged), { mode: 0o600 });
  chmodSync(tmp, 0o600);
  renameSync(tmp, path());
}
export function publicSettings() {
  const settings = loadSettings();
  return { rapidApiKeyConfigured: !!settings.rapidApiKey, flightsCycle: settings.flightsCycle || '', staysCycle: settings.staysCycle || '', aiProvider: settings.aiProvider || 'none', aiModel: settings.aiModel || '', aiBaseUrl: settings.aiBaseUrl || '', aiApiKeyConfigured: !!settings.aiApiKey };
}
