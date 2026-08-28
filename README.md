<div align="center">

# Prospecx MCP

**Run your B2B lead pipeline from Claude, Cursor, or any MCP client.**

Prospecx finds people posting buyer intent, scores them for fit, and helps you
reach out. This connector puts that pipeline inside the conversation — ask for
your best leads, read the post that surfaced one, leave a note, move a status,
in plain language.

[Connect](#connect) · [Tools](#tools) · [Prompts](#prompts) · [Resources](#resources) · [Safety](#how-spending-is-protected) · [API](./docs/API.md)

</div>

---

## Connect

**One URL. No API key, nothing to install.**

```
https://prospecx.in/api/mcp
```

You approve the connection with your normal Prospecx login and can revoke it any
time from **Settings → API keys**.

### Claude (desktop or web)

Settings → Connectors → **Add custom connector** → paste the URL → **Connect** →
**Approve** on the Prospecx screen that opens.

### Claude Code

```bash
claude mcp add --transport http prospecx https://prospecx.in/api/mcp
```

Your browser opens to approve the connection the first time you use it.

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "prospecx": { "url": "https://prospecx.in/api/mcp" }
  }
}
```

### Local / stdio

The npm package runs the server over stdio against an API key, for clients that
cannot do OAuth or for local development.

```bash
npx @prospecx/mcp
```

**It ships a subset: 13 tools, not 18.** The three send tools, `prospecx_start_here`
and `prospecx_draft_outreach` are connector-only for now. Use the hosted
connector above unless you specifically need stdio — it needs no API key, and it
is where new tools land first.

See [docs/LOCAL.md](docs/LOCAL.md).

---

## Try it

```
what should I do today?
find leads hiring for React, score 7 or above
show me lead Asha
how many points do I have left?
add a note to that lead saying I called them
```

Or use a slash command: `/prospecx_daily_standup`, `/prospecx_prep_call`,
`/prospecx_write_outreach`.

---

## Tools

Eighteen tools over the hosted connector. Every one is listed here; nothing is
hidden behind a flag.

### Start here

| Tool | What it does |
|---|---|
| `prospecx_start_here` | Your workspace as it actually is — lead count, what it tracks, points balance, what this connection may do — plus opening moves built from that state. Free, no arguments, and the best first call in any conversation. |

### Read — free, and cannot change anything

| Tool | What it does |
|---|---|
| `prospecx_get_today_brief` | The day's digest: moves worth making, deals at risk, forecast |
| `prospecx_search_leads` | Search by text, status, minimum fit score |
| `prospecx_get_lead` | One lead in full, including the post that surfaced them. Renders as an **interactive card** in clients that support MCP Apps |
| `prospecx_get_pipeline` | Leads by stage, with counts and deal value |
| `prospecx_get_account` | Points balance and the price of every chargeable action |
| `prospecx_get_insights` | Workspace counters: totals, recent adds, average fit |
| `prospecx_get_agenda` | Follow-up reminders due soon |
| `prospecx_get_lists` | Saved lists, or the leads inside one |

### Write — free, and only touches your own records

| Tool | What it does |
|---|---|
| `prospecx_draft_outreach` | Email subject and body, a WhatsApp message, a LinkedIn DM and a 30-second call script — all anchored on the post that surfaced the lead. Drafts only; nothing is sent |
| `prospecx_annotate_lead` | Note, status and follow-up reminder in one call |
| `prospecx_manage_list` | Create a list and/or add leads to it |
| `prospecx_update_deal` | Set deal value, currency, pipeline stage |
| `prospecx_add_lead` | Add a lead manually |

### Spend — costs prepaid points, always previews first

| Tool | Cost |
|---|---|
| `prospecx_unlock_lead_contacts` | 1 point (contacts) · 2 points (deep research) |

### Reach a person — shows you the message first

These send to a real human under your name. Each previews the exact text and
returns a confirmation token; nothing leaves until you approve it.

| Tool | What it does |
|---|---|
| `prospecx_send_email` | Sends an email from your connected mailbox. The lead's contact must already be unlocked |
| `prospecx_send_whatsapp` | Sends a WhatsApp message. Requires an unlocked phone number |
| `prospecx_enroll_in_sequence` | Puts a lead into an automated follow-up sequence |

**LinkedIn is draft-only.** `prospecx_draft_outreach` writes a LinkedIn DM for
you to copy across. Prospecx has no LinkedIn send path and LinkedIn exposes no
DM API, so no tool here claims otherwise.

---

## Prompts

Prompts appear as **slash commands** in clients that support them.

| Prompt | What it does |
|---|---|
| `prospecx_daily_standup` | Turns today's brief into a prioritised plan |
| `prospecx_prep_call` | A one-page brief on a lead before you speak to them |
| `prospecx_write_outreach` | Drafts an opener grounded in what the lead posted |
| `prospecx_triage_inbox` | Ranks open leads into reply today / worth a look / let it cool, reading the post rather than sorting by score, and flags overdue follow-ups |

---

## Resources

Resources appear in the client's **attach / context menu**.

| URI | Contents |
|---|---|
| `prospecx://today` | Today's brief |
| `prospecx://leads/hot` | Highest-scoring open leads |
| `prospecx://lead/{id}` | Any single lead, with autocomplete over real leads |

Clients supporting MCP Apps also receive two UI resources —
`ui://prospecx/welcome.html` and `ui://prospecx/lead.html` — which are what
`prospecx_start_here` and `prospecx_get_lead` render into.

---

## How spending is protected

Anything that costs points cannot fire in one step.

1. The assistant calls the tool **without** a confirm token. Nothing is charged.
   It gets back the exact cost, the resulting balance, and a short-lived token.
2. It shows you that, and asks.
3. Only a second call carrying that token executes.

The token maps to **the payload that was previewed**, held server-side — so a
second call cannot redirect the spend at a different lead. An assistant cannot
show you one thing and charge you for another. Tokens are single-use and expire
in five minutes.

Two more guarantees, both enforced server-side:

- **Scopes.** A connection without `spend:points` physically cannot spend,
  whatever the assistant tries. The dangerous scopes are never granted by default.
- **Workspace pinning.** A connection sees exactly one workspace, and stops
  working the moment its creator loses access to it.

---

## Contacts are pay-per-lead

A lead with `contact_locked: true` has not had its contacts purchased. That is a
billing state, **not missing data** — unlock it and the email and phone appear.

---

## Skills

[`skills/`](./skills) contains two Agent Skills that make the connector
noticeably better to use:

- **`prospecx-prospecting`** — search strategy, what the fit score means, how to
  triage without wasting points.
- **`prospecx-outreach`** — the two-step spend contract, and how to write an
  opener that does not read as a template.

---

## Documentation

- [API reference](./docs/API.md) — every REST endpoint behind the connector
- [Authorization](./docs/AUTH.md) — the OAuth 2.1 flow, scopes, token shape
- [Local development](./docs/LOCAL.md) — stdio transport, building, testing

## Licence

UNLICENSED — © Indigen Services.
