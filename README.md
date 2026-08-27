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

For development against a local server, this package also ships a stdio entry
point. See [docs/LOCAL.md](./docs/LOCAL.md).

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

### Read — free, and cannot change anything

| Tool | What it does |
|---|---|
| `prospecx_get_today_brief` | The day's digest: moves worth making, deals at risk, forecast |
| `prospecx_search_leads` | Search by text, status, minimum fit score |
| `prospecx_get_lead` | One lead in full, including the post that surfaced them |
| `prospecx_show_lead` | The same lead as an **interactive card** rendered in the client |
| `prospecx_get_pipeline` | Leads by stage, with counts and deal value |
| `prospecx_get_account` | Points balance and the price of every chargeable action |
| `prospecx_get_insights` | Workspace counters: totals, recent adds, score distribution |
| `prospecx_get_agenda` | Follow-up reminders due soon |
| `prospecx_get_lists` | Saved lists, or the leads inside one |

### Write — free, and only touches your own records

| Tool | What it does |
|---|---|
| `prospecx_annotate_lead` | Note, status and follow-up reminder in one call |
| `prospecx_manage_list` | Create a list and/or add leads to it |
| `prospecx_update_deal` | Set deal value, currency, pipeline stage |
| `prospecx_add_lead` | Add a lead manually |

### Spend — costs prepaid points, always previews first

| Tool | Cost |
|---|---|
| `prospecx_unlock_lead_contacts` | 1 point (contacts) · 2 points (deep research) |

---

## Prompts

Prompts appear as **slash commands** in clients that support them.

| Prompt | What it does |
|---|---|
| `prospecx_daily_standup` | Turns today's brief into a prioritised plan |
| `prospecx_prep_call` | A one-page brief on a lead before you speak to them |
| `prospecx_write_outreach` | Drafts an opener grounded in what the lead posted |

---

## Resources

Resources appear in the client's **attach / context menu**.

| URI | Contents |
|---|---|
| `prospecx://today` | Today's brief |
| `prospecx://leads/hot` | Highest-scoring open leads |
| `prospecx://lead/{id}` | Any single lead, with autocomplete over real leads |

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
