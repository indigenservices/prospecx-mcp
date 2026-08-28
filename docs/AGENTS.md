# Orientation for AI tools

You are probably reading this because you are an assistant that has just been
connected to Prospecx, or an agent reading this repository. This page is the
short version of everything that matters. It is written for you, not for a
human.

---

## What this server is

Prospecx watches for people posting **buying intent** — hiring for a stack,
asking for a vendor recommendation, complaining about a tool they want to
replace — scores them against the workspace's ideal customer, and helps the user
reach out.

You are not querying a generic CRM. Every lead here exists because of something
they wrote in public, and that post is the single most useful field on the
record. It is what makes an opener specific rather than templated.

---

## Call this first

`prospecx_start_here` — read-only, free, no arguments.

It returns the workspace as it actually is: lead count, the intent phrases it
tracks, the points balance, which scopes this connection was granted, and
suggested opening moves built from that state.

Call it the first time Prospecx comes up in a conversation. Do not describe the
workspace from memory — an empty workspace and a busy one need opposite advice,
and you cannot tell which you are in without asking.

---

## The rules that are not style preferences

**1. Never invent a lead id.** Every lead tool takes a UUID that only
`prospecx_search_leads` returns. A fabricated id returns not-found; a real id
from another workspace also returns not-found, never that workspace's data.

**2. Anything that spends or sends runs in two calls.**

```
call 1 → no confirm_token → nothing happens → you get a cost + a token
         ↓
     SHOW THE USER. GET A REAL ANSWER.
         ↓
call 2 → with the token → it happens
```

Never chain both in one turn. A "yes" earlier in the conversation about
something else is not approval for this. If the user said "unlock the top 3",
preview all three and present the total before confirming any of them.

Tokens are single-use, expire in 5 minutes, and are bound to the lead they were
previewed for. An expired token means preview again **and re-ask** — a fresh
preview is not standing approval.

**3. `contact_locked: true` is a billing state, not missing data.** It means the
workspace has not paid for that person's contact details. It does not mean they
have no email. Say so accurately; do not report the lead as incomplete.

**4. Drafting is free; sending is not reversible.** Use
`prospecx_draft_outreach` freely. Treat every send tool as an action that
reaches a real human under the user's name.

**5. LinkedIn is draft-only.** Prospecx has no LinkedIn send path and LinkedIn
exposes no DM API. Hand the user the DM text to paste. Do not offer to send it.

---

## Choosing a tool

| The user says | Reach for |
|---|---|
| Anything, first time in the conversation | `prospecx_start_here` |
| "what should I do", "catch me up" | `prospecx_get_today_brief` |
| Names a kind of lead, or "my best leads" | `prospecx_search_leads` |
| Names or points at one person | `prospecx_get_lead` |
| "what do I say", "draft an email" | `prospecx_draft_outreach` |
| "how much will that cost" | `prospecx_get_account` |
| "unlock", "get me their email" | `prospecx_unlock_lead_contacts` |
| "send it" | `prospecx_send_email` / `prospecx_send_whatsapp` |
| Reports what happened on a call | `prospecx_annotate_lead` |
| "it's worth X", "move them to Y" | `prospecx_update_deal` |
| Describes someone met elsewhere | `prospecx_add_lead` |

Full signatures: [TOOLS.md](TOOLS.md).

---

## Writing an opener that is not slop

The post is the whole point. If your draft would make sense sent to a different
person, it is wrong.

- Quote or paraphrase the specific thing they said.
- Under 90 words.
- No "I hope this finds you well", no flattery, no "I came across your profile".
- One ask, and make it small.
- Match the user's language. English, Hindi and Hinglish are all in use here.

`prospecx_draft_outreach` already does this. Prefer it over freehand, and prefer
editing its output over starting again.

---

## Skills

Two Agent Skills ship in [`skills/`](../skills) and encode the above in more
depth:

- `prospecx-prospecting` — finding, filtering, ranking and triaging leads
- `prospecx-outreach` — the spend contract, drafting, and sending

---

## Machine-readable

- Tool schemas: call `tools/list` on the connector.
- HTTP surface: [API.md](API.md).
- Auth: [AUTH.md](AUTH.md) — OAuth 2.1 with PKCE, RFC 9728 discovery, RFC 8707
  resource indicators.
