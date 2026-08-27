#!/usr/bin/env node
/**
 * Remote (Streamable HTTP) transport for the Prospecx MCP server.
 *
 * Why this exists alongside stdio: a remote server needs no install and no npm
 * package. A user pastes one URL into their MCP client and is connected. That is
 * the difference between "run npx, hope it resolves" and "paste a link".
 *
 * MULTI-TENANT, AND THAT DRIVES THE DESIGN. This process holds no credential of
 * its own. Every request must carry the caller's own Prospecx API key, and a
 * fresh server + client pair is built per request from THAT key, then discarded.
 * Nothing about one caller can leak into another's request because nothing is
 * shared: the transport runs in stateless mode (sessionIdGenerator: undefined),
 * so there is no session map to confuse, and no cross-request memory to poison.
 */
import express, { type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ProspecxClient } from './client.js';
import { DEFAULT_API_BASE } from './constants.js';
import { buildServer } from './server.js';

const PORT = Number(process.env.PORT || 8787);
const API_BASE = process.env.PROSPECX_API_BASE || DEFAULT_API_BASE;

const app = express();
app.use(express.json({ limit: '4mb' }));

/** Liveness. Deliberately reveals nothing about configuration or tenants. */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'prospecx-mcp', transport: 'streamable-http' });
});

/**
 * A JSON-RPC-shaped error, because an MCP client parses this body. Returning
 * Express's HTML error page here would leave the client with nothing usable.
 */
function rpcError(res: Response, status: number, message: string): void {
  res.status(status).json({
    jsonrpc: '2.0',
    error: { code: status === 401 ? -32001 : -32603, message },
    id: null,
  });
}

app.post('/mcp', async (req: Request, res: Response) => {
  const header = req.headers.authorization || '';
  const key = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!key) {
    return rpcError(res, 401,
      'Missing Prospecx API key. Send it as an Authorization: Bearer px_live_... header. ' +
      'Create a key in Prospecx under Settings -> API keys.');
  }
  // Shape-check only. Whether the key is REAL is decided by the Prospecx API on
  // the first tool call — this process deliberately cannot validate keys itself,
  // so it can never become an oracle for which keys exist.
  if (!/^px_live_[A-Za-z0-9_-]{8}_[A-Za-z0-9_-]{32}$/.test(key)) {
    return rpcError(res, 401, 'That does not look like a Prospecx API key. It should start with px_live_.');
  }

  const server = buildServer(new ProspecxClient(key, API_BASE));
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  // Tie both to the request so a dropped connection cannot leak a server object.
  res.on('close', () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    if (!res.headersSent) {
      rpcError(res, 500, `MCP server error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
});

// GET/DELETE on /mcp are part of the Streamable HTTP spec for resumable streams.
// Stateless mode supports neither, so answer honestly instead of hanging.
for (const method of ['get', 'delete'] as const) {
  app[method]('/mcp', (_req, res) => {
    rpcError(res, 405, 'This server runs stateless: only POST /mcp is supported. Server-initiated streams and session termination are not available.');
  });
}

app.listen(PORT, () => {
  process.stdout.write(`prospecx-mcp http listening on :${PORT} -> ${API_BASE}\n`);
});
