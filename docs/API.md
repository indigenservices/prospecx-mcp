# Prospecx API v1 — reference

Base URL: `https://prospecx.in/api/v1`

Every endpoint is authenticated and scoped to exactly one workspace. There is no
way to address another workspace's data: the workspace is derived from the
credential, never from the request.

## Authentication

Two credentials reach this API.

**OAuth access token** — what the MCP connector uses. See [AUTH.md](./AUTH.md).

**API key** — for your own scripts. Create one at **Settings → API keys**.

```http
Authorization: Bearer px_live_<8-char id>_<32-char secret>
```

Shown once at creation. Revoking takes effect immediately.

## Conventions

- All responses are JSON. An unmatched path returns
  `{"error":"unknown_endpoint"}`, never HTML.
- List endpoints return `{ data: [...], pagination: { limit, offset, total } }`.
- `limit` is clamped to 100. `offset` is floored at 0.
- A record in another workspace returns **404**, never 403 — a 403 would confirm
  the id exists.

## Errors

| Status | `error` | Meaning |
|---|---|---|
| 401 | `invalid_api_key` | Missing, malformed, revoked or expired credential |
| 403 | `insufficient_scope` | The credential lacks the scope; includes `required_scope` |
| 402 | `insufficient_points` | Not enough prepaid points for the action |
| 404 | `lead_not_found` | No such record **in this workspace** |
| 410 | `confirm_token_invalid` | Confirmation expired or already used |
| 429 | `point_cap_exceeded` | The key's daily point cap would be exceeded |
| 429 | — | Rate limit: 60 requests/minute per credential |

## Scopes

`read:leads` · `read:pipeline` · `read:insights` · `read:company` ·
`write:notes` · `write:status` · `write:lists` · `spend:points` · `send:outreach`

The last two are never granted by default.

---

## Leads

### `GET /leads`
Scope `read:leads`.

| Param | Type | Notes |
|---|---|---|
| `q` | string | Matches lead name and company. **Not** the post text. |
| `status` | string | Exact match |
| `score_min` | int | 0–100. Use 7+ for "best leads" |
| `limit` | int | 1–100, default 20 |
| `offset` | int | default 0 |

Contact fields are **omitted entirely** unless that lead has been unlocked;
`contact_locked` says which.

```json
{
  "data": [{
    "id": "11111111-2222-4333-8444-555555555555", "name": "Aanya Mehta",
    "company": "Brightfold Commerce", "headline": "Co-founder & COO",
    "status": "New", "score": 9,
    "linkedin_url": "https://www.linkedin.com/in/…", "contact_locked": true
  }],
  "pagination": { "limit": 20, "offset": 0, "total": 1284 }
}
```

### `GET /leads/:id`
Scope `read:leads`. Adds `post_text`, `post_url`, `post_date`, `intent_label`,
`intent_summary`, `notes`, `tags`, `pipeline_stage`, `deal_value`.

### `POST /leads`
Scope `write:notes`. Body `{ name, company?, headline?, linkedin_url?, notes? }`.

### `PATCH /leads/:id/notes`
Scope `write:notes`. Body `{ notes }`. **Replaces** the note; it does not append.

### `PATCH /leads/:id/status`
Scope `write:status`. Body `{ status }`.

### `PATCH /leads/:id/deal`
Scope `write:status`. Body `{ deal_value?, deal_currency?, pipeline_stage? }`.
At least one required.

### `POST /leads/:id/reminder`
Scope `write:notes`. Body `{ remind_at: ISO8601, note? }`.

### `POST /leads/:id/drafts`
Scope `read:leads`. Costs no points and sends nothing.

Body `{ context?, language?: "english"|"hinglish"|"hindi", force?: boolean }`.

Returns first-contact drafts for every channel at once:

```json
{
  "lead_id": "1111…", "lead_name": "Aanya Mehta",
  "email_subject": "…", "email_body": "…",
  "whatsapp": "…", "linkedin_dm": "…", "cold_call_script": "…",
  "booking_url": "https://cal.com/…",
  "cached": true, "cached_at": "2026-08-28T09:00:00Z"
}
```

Cached for 24 hours and shared with the Prospecx app, so the draft returned here
is the one the user already sees in the product. `context` or a different
`language` bypasses the cache; so does `force: true`.

`linkedin_dm` is text to paste. There is no LinkedIn send endpoint, here or
anywhere in Prospecx.

### `POST /leads/:id/unlock` — spends points
Scope `spend:points`. **Two-phase.**

> This HTTP endpoint keeps the preview/confirm contract. The MCP connector does
> not — its spend and send tools complete in one call. They are different
> surfaces with different audiences: a script calling this API can hold a token
> between two requests trivially, and an assistant holding one across a
> conversation turn is a different proposition. See [SECURITY.md](SECURITY.md).

Preview — body `{ kind: "contacts" | "deep_research" }`:

```json
{
  "preview": { "action": "unlock_lead", "lead_name": "Asha R",
               "description": "Reveal verified contact details for this lead." },
  "cost_points": 1, "balance_after": 26,
  "confirm_token": "cf_…", "expires_at": "2026-08-28T09:05:00Z"
}
```

Execute — body `{ kind, confirm_token }`. The token is single-use, expires in
5 minutes, and is bound to the previewed lead. The server executes **the
previewed payload**, not the body of the second call.

---

## Outreach — reaches a real person

Scope `send:outreach`. **Two-phase**, exactly like unlock: a call without
`confirm_token` sends nothing and returns the exact message plus a single-use
token; only a second call carrying that token sends.

| Endpoint | Body (preview) | Notes |
|---|---|---|
| `POST /leads/:id/email` | `{ subject, body }` | From the workspace's connected mailbox |
| `POST /leads/:id/whatsapp` | `{ body }` | Requires an unlocked phone number |
| `POST /leads/:id/sequence` | `{ sequence_id }` | Enrols into an automated follow-up |

A lead whose contacts are still locked returns **402** rather than falling back
to an address the workspace has not paid for.

---

## Pipeline, insights, agenda

### `GET /pipeline`
Scope `read:pipeline`. Stages with `count`, `total_value` and up to 10 sample
leads each, plus `totals`. Never includes contact details.

### `GET /insights`
Scope `read:insights`. Workspace counters: totals, recent additions, breakdown by
status and ICP type, average score, unlocked count, pipeline value.

### `GET /reminders`
Scope `read:leads`. `?days=` (default 14), `?include_fired=true`.

### `GET /credits`
Scope `read:insights`. `{ balance, costs: { unlock_contacts, deep_research, lead_lens } }`.

---

## Lists

| Endpoint | Scope | Notes |
|---|---|---|
| `GET /lists` | `read:leads` | All lists with item counts |
| `POST /lists` | `write:lists` | `{ name }` |
| `GET /lists/:id/items` | `read:leads` | Leads in the list; contact lock applies |
| `POST /lists/:id/items` | `write:lists` | `{ lead_id }`. Idempotent |

---

## Key management

Under `/api/me` (or `/api/users/me`), authenticated with a normal session, and
gated by the `manage_api_keys` permission — workspace owners have it.

| Endpoint | Notes |
|---|---|
| `GET /api/me/api-keys` | Never returns the hash or the secret |
| `POST /api/me/api-keys` | `{ name, scopes?, expires_at? }` → returns `token` **once** |
| `DELETE /api/me/api-keys/:id` | Revokes immediately |
