# Local development

## Build

```bash
npm install
npm run build      # -> dist/
npm test           # drives the server over a real in-memory MCP transport
npm run typecheck
```

## Transports

**stdio** — `dist/index.js`. Reads `PROSPECX_API_KEY` from the environment.

```bash
claude mcp add prospecx --scope user \
  --env PROSPECX_API_KEY=px_live_your_key_here \
  -- node /path/to/prospecx-mcp/dist/index.js
```

**Streamable HTTP** — `dist/http.js`. Stateless and multi-tenant: it holds no
credential of its own, and builds a fresh server per request from that request's
`Authorization` header.

```bash
PORT=8787 node dist/http.js
```

## Environment

| Variable | Required | Default |
|---|---|---|
| `PROSPECX_API_KEY` | stdio only | — |
| `PROSPECX_API_BASE` | no | `https://prospecx.in/api/v1` |

## A note on Zod

Any file calling `registerTool` must import from **`zod/v3`**, not `zod`:

```ts
import { z } from 'zod/v3';
```

The SDK's compat layer types against `zod/v3` explicitly. Importing from `zod`
yields a different type identity under some module-resolution settings, and
TypeScript then churns through cross-version instantiation until it fails with
`TS2589: Type instantiation is excessively deep` — pointing at your file rather
than the real cause. See
[typescript-sdk#1180](https://github.com/modelcontextprotocol/typescript-sdk/issues/1180).
