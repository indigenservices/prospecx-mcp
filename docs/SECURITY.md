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

## Nothing spends or sends in one step

Every tool that costs money or reaches a person runs in **two calls**:

1. Called without a confirmation token, it charges nothing and sends nothing. It
   returns the exact cost, the resulting balance or the exact message text, and
   a single-use token.
2. Only a second call carrying that token performs the action.

The properties that make this more than a convention:

- **Single use.** A token works once.
- **Five-minute expiry.** A stale token fails safely rather than firing late.
- **Bound to its subject.** A token previewed for one lead cannot be spent on
  another — it fails rather than charging for the wrong thing.
- **Server-enforced.** The server guarantees the action matches the preview. The
  assistant cannot substitute different text after you approve.

What the server cannot guarantee is that a human actually read the preview. That
is why the tool descriptions instruct the model to show it and wait, and why the
in-card buttons only ever trigger the **preview**, never the confirmation.

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
