import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { listSearches } from '../lib/local/store';
const server = new McpServer({ name: 'destino-certo', version: '1.0.0' });
server.registerTool('listar_viagens', {
  description: 'Lista pesquisas salvas localmente e seus últimos preços. Não cria pesquisas nem faz chamadas externas.',
  inputSchema: {},
}, async () => ({ content: [{ type: 'text', text: JSON.stringify(listSearches()) }] }));
server.registerTool('detalhar_viagem', {
  description: 'Mostra os detalhes de uma pesquisa salva localmente. Não revela credenciais.',
  inputSchema: { id: z.string().uuid() },
}, async ({ id }) => {
  const search = listSearches().find(item => item.id === id);
  return search ? { content: [{ type: 'text', text: JSON.stringify(search) }] } : { isError: true, content: [{ type: 'text', text: 'Pesquisa não encontrada.' }] };
});
server.connect(new StdioServerTransport()).catch(() => { process.stderr.write('Não foi possível iniciar o servidor MCP.\n'); process.exitCode = 1; });
