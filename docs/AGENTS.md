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

**0. Two searches, and only one is free.** `prospecx_search_leads` looks through
leads the workspace ALREADY has and costs nothing. `prospecx_find_new_leads` goes
out and finds people it has never seen, and costs ONE POINT PER LEAD REQUESTED.
Search first. Reaching for the paid one when the answer was already in the
workspace is the most expensive mistake available here.

**1. Never invent a lead id.** Every lead tool takes a UUID that only
`prospecx_search_leads` returns. A fabricated id returns not-found; a real id
from another workspace also returns not-found, never that workspace's data.

**2. Spending and sending happen on the FIRST call.** There is no confirmation
step and no second call. `prospecx_unlock_lead_contacts` charges immediately;
`prospecx_send_email` and `prospecx_send_whatsapp` deliver immediately;
`prospecx_enroll_in_sequence` commits every message in the cadence at once.

Nothing will stop you, so the discipline is yours:

- Say what it costs, or show the exact message, **in your reply, before you
  call the tool.**
- Only act when the user asked for that specific action on that specific
  person. "Draft an email" is not "send an email". "Find me leads" is not
  "unlock them".
- Several leads means several charges. Give the total first.
- Never alter text between showing it and sending it.

A workspace can switch confirmation back on. If a reply hands you a
`confirm_token`, that workspace did: show the user what it says and call again
with the token once they agree.

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
| "has anything moved", "what's new" | `prospecx_get_radar` |
| "keep an eye on her", "tell me when they post" | `prospecx_watch_lead` |
| "who am I meeting", "what did we discuss" | `prospecx_get_meetings` / `prospecx_get_meeting` |
| "did they read the proposal" | `prospecx_get_proposals` |
| "find me NEW leads" (costs points) | `prospecx_find_new_leads` |

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
