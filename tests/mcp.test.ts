import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';

test('servidor MCP expõe ferramentas de leitura local e responde sem credenciais', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'destino-mcp-'));
  const client = new Client({ name: 'teste', version: '1.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: ['--import', 'tsx', 'scripts/mcp.ts'], cwd: process.cwd(), env: { ...getDefaultEnvironment(), DESTINO_DATA_DIR: dir } });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(tool => tool.name).sort(), ['detalhar_viagem', 'listar_viagens']);
    const result = await client.callTool({ name: 'listar_viagens', arguments: {} });
    assert.equal(result.isError, undefined);
    assert.deepEqual(result.content, [{ type: 'text', text: '[]' }]);
  } finally { await client.close(); rmSync(dir, { recursive: true, force: true }); }
});
