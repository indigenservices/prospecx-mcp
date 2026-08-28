# What this connector can and cannot do

The honest version, so you can decide what to approve.

---

## It only ever sees one workspace

Every tool is scoped to the workspace the token was issued for. `company_id`
comes from the token, never from a request body. A lead id belonging to another
workspace returns **not-found**, not forbidden — so a connection cannot even
probe for the existence of ids outside its own data.

---

## Scopes you approve individually

Nine scopes. You choose which to grant when you connect, and a connection that
was not granted a scope gets an actionable refusal rather than a silent failure.

| Scope | Grants |
|---|---|
| `read:leads` | Search and read leads |
| `read:pipeline` | Deals and stages |
| `read:insights` | Counters, briefs, reminders |
| `read:company` | Workspace and team profile |
| `write:notes` | Add or edit notes |
| `write:status` | Change status, stage and deal value |
| `write:lists` | Create lists, add leads to them |
| `spend:points` | **Spends prepaid points.** Unlocks, deep research |
| `send:outreach` | **Messages real people.** Email, WhatsApp, sequences |

The last two are off unless you deliberately turn them on.

---

## Spending and sending happen in one call

This workspace's connector executes a spend or a send on the **first** tool
call. There is no confirmation round-trip, and no second call is needed.

Be clear about what that does and does not mean.

**What still holds:**

- **A daily ceiling.** The connector cannot spend more than 50 points a day by
  default, whatever the balance holds. This is the backstop that replaced
  confirmation: an assistant stuck in a retry loop hits it and stops, rather than
  emptying the account. Adjustable per workspace, and `prospecx_get_account`
  reports what is left of today's allowance alongside the balance.
- **A per-connection rate limit** of 120 requests a minute, keyed on the
  connection rather than the network address, so one busy workspace cannot
  throttle another sharing an assistant's egress.
- **Scopes.** A connection not granted `spend:points` cannot spend, and one not
  granted `send:outreach` cannot message anyone. These are the real gate, and
  you choose them when you connect.
- **The charge matches the computation.** Internally the server still prices the
  action and then executes *that priced action*, so the amount taken cannot
  drift from the amount calculated.
- **Locked leads still cannot be emailed.** Contacts are pay-per-lead and the
  send tools refuse rather than falling back to an address you have not bought.
- **Already-unlocked is still free**, and says so.
- **Disconnect still works instantly**, from Settings → MCP, even mid-conversation.

**What no longer holds:**

- **You are not shown the cost or the message before it happens.** The assistant
  is instructed to tell you first, and the tool descriptions say so emphatically
  — but that is the model's judgement, not something the server enforces.
- **There is no window to cancel.** An unlock is charged the moment the tool
  runs; an email is gone.

If that trade is wrong for your workspace, turn confirmation back on:

```sql
-- settings is jsonb on companies
UPDATE companies SET settings = settings || '{"mcp_confirm_spend": true}'::jsonb
 WHERE id = '<your workspace id>';
```

And to change the daily ceiling (0 disables it entirely):

```sql
UPDATE companies SET settings = settings || '{"mcp_daily_point_cap": 20}'::jsonb
 WHERE id = '<your workspace id>';
```

With it on, a spend or send returns a preview and a single-use token that
expires in five minutes and is bound to the lead it was previewed for, and
nothing happens until a second call carries that token.

The safest configuration if you are unsure: connect **without** `spend:points`
and `send:outreach`. Everything else — search, briefs, drafting across all four
channels — is free and changes nothing you would miss.

---

## Contacts are pay-per-lead

`contact_locked: true` means the workspace has not purchased that lead's
contact details. It is a billing state, not missing data.

A lead whose contacts are locked **cannot be emailed** — the send tools refuse
rather than falling back to an address you have not paid for. Unlocking an
already-unlocked lead is free and says so, so an accidental repeat costs
nothing.

---

## What it cannot do at all

- Send on LinkedIn. There is no API for it; drafts are text you paste.
- Delete a lead, a list, or a workspace.
- Read another workspace's data.
- Change billing, plans, or team membership.
- Act without a token issued to your own account.

---

## Authorization

OAuth 2.1, no API key for you to store or leak:

- PKCE (S256) on every authorization
- RFC 9728 protected-resource metadata for discovery
- RFC 8414 authorization-server metadata
- RFC 7591 dynamic client registration
- RFC 8707 resource indicators — a token is bound to this MCP server and is
  rejected anywhere else
- Exact redirect-URI matching, no prefix matching

An ordinary Prospecx web session cannot be replayed against the MCP endpoint:
tokens carry both an audience and a `token_use` claim, and both are checked.

Details in [AUTH.md](AUTH.md).

---

## Reporting something

Found a way to make this misbehave? Email **security@prospecx.in** rather than
opening a public issue. Include what you did and what happened; a proof of
concept helps.
