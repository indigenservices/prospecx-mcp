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

## Which tools the stdio package ships

Thirteen of the connector's eighteen. These are present:

`prospecx_get_today_brief` · `prospecx_search_leads` · `prospecx_get_lead` ·
`prospecx_get_pipeline` · `prospecx_get_insights` · `prospecx_get_agenda` ·
`prospecx_get_account` · `prospecx_get_lists` · `prospecx_annotate_lead` ·
`prospecx_update_deal` · `prospecx_add_lead` · `prospecx_manage_list` ·
`prospecx_unlock_lead_contacts`

These are **connector-only** for now:

`prospecx_start_here` · `prospecx_draft_outreach` · `prospecx_send_email` ·
`prospecx_send_whatsapp` · `prospecx_enroll_in_sequence`

New tools land on the hosted connector first. Unless you specifically need
stdio — a client that cannot do OAuth, or local development against the API —
use the connector: it needs no API key and it is where the full surface lives.

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
