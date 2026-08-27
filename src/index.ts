#!/usr/bin/env node
/**
 * Prospecx MCP server — stdio entry point.
 *
 * Exposes a workspace's B2B lead pipeline to any MCP client over stdio. The
 * transport is deliberately separated from the tool layer so the same tools can
 * later be served over HTTP without being rewritten.
 *
 * Auth is a single Prospecx API key in the environment. The key is pinned to one
 * workspace and carries explicit scopes, so a read-only key physically cannot
 * spend points or send messages — the guarantee lives on the server, not here.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ProspecxClient } from './client.js';
import { DEFAULT_API_BASE } from './constants.js';
import { buildServer } from './server.js';

async function main(): Promise<void> {
  const apiKey = process.env.PROSPECX_API_KEY;
  if (!apiKey) {
    // stderr, not stdout: stdout is the JSON-RPC channel and any stray byte on it
    // corrupts the protocol handshake.
    process.stderr.write(
      'prospecx-mcp: PROSPECX_API_KEY is not set.\n' +
      'Create a key in Prospecx under Settings -> API keys, then set it in your MCP client config:\n' +
      '  "env": { "PROSPECX_API_KEY": "px_live_..." }\n',
    );
    process.exit(1);
  }

  const client = new ProspecxClient(apiKey, process.env.PROSPECX_API_BASE || DEFAULT_API_BASE);
  const server = buildServer(client);
  await server.connect(new StdioServerTransport());
  process.stderr.write('prospecx-mcp: ready\n');
}

// Only run when executed directly, so tests can import buildServer without
// spawning a transport that would hang the test process.
const invokedDirectly = process.argv[1] !== undefined && /prospecx-mcp|dist[\/\\]index\.js/.test(process.argv[1]);
if (invokedDirectly) {
  main().catch((err: unknown) => {
    process.stderr.write(`prospecx-mcp: fatal: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
