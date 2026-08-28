# Tool reference

Generated from the live connector's `tools/list`, not written from memory —
so the arguments below are the ones the server actually validates.

**18 tools.** Every one is listed; nothing is hidden behind a flag.

> Spending and sending complete in a SINGLE call. There is no confirmation
> step to catch a mistake — see [SECURITY.md](SECURITY.md) for what still
> protects you and what no longer does.

> The stdio npm package ships a subset. See [LOCAL.md](LOCAL.md).

---

## Start here

### `prospecx_start_here`

Orients you in this Prospecx workspace: how many leads it holds, what it is
tracking, the points balance, what this connection is allowed to do, and a few
good opening moves.

Call this the FIRST time Prospecx comes up in a conversation, and whenever the
user asks what Prospecx can do, how to start, what is in here, or seems unsure
what to ask for. It is read-only, costs nothing and needs no arguments.

In clients that support it this renders as an interactive welcome card whose
buttons put a suggested request into the conversation; elsewhere the same
facts come back as text. Prefer it over guessing — the suggestions it returns
are built from the workspace's real state, so an empty workspace is told to go
find leads and a busy one is told who to call.

_No arguments._


---

## Read — free, changes nothing

### `prospecx_get_today_brief`

Get the workspace's daily digest — the moves worth making today, deals at
risk, forecast and coaching notes.

Best FIRST call for an open-ended question like "what should I do today",
"what needs attention", or "catch me up": it is a curated answer rather than
raw data you would have to rank yourself.

Returns the digest as Prospecx computes it. Costs nothing.

_No arguments._


### `prospecx_search_leads`

Search the workspace's B2B leads by text, status, and minimum fit score.

Leads are people who posted something showing buying intent. Each carries a
fit score (higher = better match for this workspace's ideal customer).

Use this FIRST whenever the user refers to leads in the abstract ("my best
leads", "anyone hiring React") — every other lead tool needs an id that only
this returns.

Contact details are withheld until a lead is unlocked: contact_locked: true is
a billing state, not missing data.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `query` | string | no | Free text matched against lead name and company, e.g. 'Acme'. Omit for no text filter. |
| `status` | string | no | Exact status filter, e.g. 'New'. Omit for all. |
| `score_min` | integer | no | Minimum fit score. Use 7+ for "best leads". |
| `limit` | integer | no | How many to return, 1-100. Default `20`. |
| `offset` | integer | no | How many to skip, for paging. Default `0`. |


### `prospecx_get_lead`

Everything known about one lead — the post that surfaced them, the intent
read, fit score, notes, tags and pipeline state — rendered as an interactive
card.

Use this whenever the user names or points at a single lead: "show me", "pull
up", "tell me about", "what's the story with", or after prospecx_search_leads
returns something worth looking at.

Returns the full lead record. In clients that support it the card renders
inline with an animated score ring, a buying-intent meter and buttons to
unlock contacts or draft an opener; elsewhere the same facts come back as
text. Contact details stay hidden until unlocked.

Requires a lead id from prospecx_search_leads — never invent one. A lead in
another workspace returns not-found rather than another workspace's data.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `lead_id` | string (uuid) | yes | Lead id from prospecx_search_leads. Never invent one. |


### `prospecx_get_pipeline`

Leads grouped by stage with counts and total deal value, plus a sample of
leads in each. Use for "how is my pipeline", forecasting, or finding a clogged
stage. Never includes contact details.

_No arguments._


### `prospecx_get_insights`

Aggregate counters for the workspace: total leads, recent additions, breakdown
by status and type, average score, how many are unlocked, and total pipeline
value. Use for "how are we doing" rather than per-lead questions.

_No arguments._


### `prospecx_get_agenda`

Follow-up reminders due soon, with the lead each belongs to. Use for "what is
coming up", "who do I owe a follow-up".

| Argument | Type | Required | Notes |
|---|---|---|---|
| `days` | integer | no | How far ahead to look, in days. Default `14`. |


### `prospecx_get_account`

Remaining points and the point cost of every chargeable action. Call BEFORE
proposing anything that spends, so you can tell the user what it will cost and
whether they can afford it.

_No arguments._


### `prospecx_get_lists`

The workspace's saved lead lists, or the leads inside one. Omit list_id for
all lists; pass it to open one.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `list_id` | string (uuid) | no | A list id to open. Omit to see all lists first. |


---

## Write — free, your own records only

### `prospecx_draft_outreach`

Write personalised first-contact drafts for one lead across every channel at
once: email subject and body, a WhatsApp message, a LinkedIn DM, and a
30-second cold-call script with objection handles. Each is anchored on the
actual post that surfaced the lead, so it reads as specific rather than
templated.

Use this whenever the user wants to reach out — "draft an email", "what do I
say to them", "write me a message", "how should I open" — and before any send
tool, so the user sees the words before they go anywhere.

DRAFTS ONLY. Nothing is sent and nobody is contacted. To actually send, show
the user the draft, let them edit it, then call prospecx_send_email or
prospecx_send_whatsapp, which preview and confirm again.

LinkedIn is draft text the user copies and pastes: Prospecx has no LinkedIn
send path, so do not offer to send it.

Costs no points. Results are cached for 24 hours and shared with the Prospecx
app, so repeat calls are free and consistent — pass force: true to rewrite, or
context to steer the angle ("mention we met at the Bangalore meetup").

Requires a lead id from prospecx_search_leads.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `lead_id` | string (uuid) | yes | Lead id from prospecx_search_leads. Never invent one. |
| `context` | string | no | Anything the drafts should account for — a prior conversation, an angle to take, a detail to mention. Forces a rewrite. |
| `language` | `english` \| `hinglish` \| `hindi` | no | Language for the conversational channels. Default english. 'hinglish' is Roman-script Hindi/English mix. |
| `force` | boolean | no | Rewrite even if a fresh cached draft exists. |


### `prospecx_annotate_lead`

Record what happened with a lead: a note, a status change, and/or a follow-up
reminder — in one call.

Costs nothing and sends nothing to the lead; only the workspace's own record
changes.

IMPORTANT: the note REPLACES any existing note rather than appending. Read the
lead first if you mean to add to it.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `lead_id` | string (uuid) | yes | Lead id from prospecx_search_leads. |
| `note` | string | no | Replacement note text. REPLACES the existing note. |
| `status` | string | no | New status, e.g. 'Contacted'. |
| `remind_at` | string (date-time) | no | ISO timestamp for a follow-up, e.g. 2026-09-01T09:00:00Z. |
| `reminder_note` | string | no | Text shown with the reminder. |


### `prospecx_update_deal`

Record what a lead is worth and where it sits in the pipeline. Changes only
the workspace's own record — costs nothing, sends nothing, and is reversible
by calling again.

Use it when the user says what a deal is worth ("this one is about 3 lakh"),
or moves it ("mark them as negotiation"). Pass any combination of the three
fields; at least one is required.

Match the workspace's existing stage vocabulary rather than inventing one —
call prospecx_get_pipeline first to see which stages are in use.

Requires a lead id from prospecx_search_leads.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `lead_id` | string (uuid) | yes | Lead id from prospecx_search_leads. Never invent one. |
| `deal_value` |  | no | Deal size as a number, in the currency below. Pass null to clear it. |
| `deal_currency` | string | no | Currency code, e.g. 'INR' or 'USD'. Defaults to the workspace's existing currency. |
| `pipeline_stage` | string | no | Stage name, e.g. 'Negotiation'. Use one already in the workspace — see prospecx_get_pipeline. |


### `prospecx_add_lead`

Create a lead the workspace found somewhere other than Prospecx — a referral,
a conference badge, an inbound email — so it lives in the same pipeline as
everything else.

Use it when the user describes a person they want tracked and no
prospecx_search_leads result matches. Search first: adding a duplicate of
someone already in the workspace makes the pipeline lie.

Costs nothing and contacts nobody. The lead starts with contacts locked like
any other, and with no fit score, because there is no post behind it to score.

Returns the new lead's id, which every other lead tool accepts.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | The person's full name. |
| `company` | string | no | Their company. |
| `headline` | string | no | Their role or title, e.g. "Head of Engineering". |
| `linkedin_url` | string (uri) | no | Full LinkedIn profile URL, if known. |
| `notes` | string | no | Why they matter — where they came from, what they need. |


### `prospecx_manage_list`

Create a named lead list and/or add leads to it. Costs nothing. Pass name
alone to create; list_id with lead_ids to add; name WITH lead_ids to create
and fill in one call. Adding a lead already present is a no-op, so retrying is
safe.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `name` | string | no | Name for a NEW list. |
| `list_id` | string (uuid) | no | An EXISTING list id to add to. |
| `lead_ids` | array | no | Lead ids to add. |


---

## Spend — costs points, charges on the first call

### `prospecx_unlock_lead_contacts`

Reveal verified contact details for a lead, or run deep research. THIS SPENDS
THE USER'S PREPAID POINTS IMMEDIATELY.

There is no confirmation step. One call charges the workspace and returns the
contacts. So the obligation moves to you:

- Only call this when the user has actually asked for THIS lead's contacts.
"Find me leads" is not a request to unlock them. - Say what it costs BEFORE
you call — check prospecx_get_account if you do not know the balance. -
Unlocking several means several charges. Say the total first, then do it.

kind='contacts' costs 1 point; kind='deep_research' costs 2. Unlocking an
already-unlocked lead is free and says so, so an accidental repeat costs
nothing.

Some workspaces switch confirmation back on. If the reply asks for a
confirm_token, show the user the cost, and call again with that token once
they agree.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `lead_id` | string (uuid) | yes | Lead id from prospecx_search_leads. |
| `kind` | `contacts` \| `deep_research` | no | 'contacts' (1 point) or 'deep_research' (2 points). Default `contacts`. |
| `confirm_token` | string | no | Only needed if a previous reply asked for one. Normally omit it — this charges in a single call. |


---

## Reach a person — sends on the first call

### `prospecx_send_email`

Send an email to a lead from the workspace's connected mailbox. THIS REACHES A
REAL PERSON IMMEDIATELY AND CANNOT BE RECALLED.

One call sends. There is no confirmation step, so the judgement is entirely
yours:

- SHOW THE USER THE EXACT SUBJECT AND BODY FIRST, in your reply, and let them
react. Use prospecx_draft_outreach to compose, show that, then send what they
approved. - Only send when the user has asked to send THIS message to THIS
person. "Draft an email" is not "send an email". - Never invent or alter the
text between showing it and sending it. - One call is one email. Sending to
several people means several calls; say who they are first.

Requires the lead's email to have been unlocked. If it has not, this refuses
and tells you the cost of unlocking rather than sending anywhere.

Some workspaces switch confirmation back on. If the reply asks for a
confirm_token, show the user the message and call again with that token once
they agree.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `lead_id` | string (uuid) | yes | Lead id from prospecx_search_leads. |
| `subject` | string | no | Subject line. Required to preview. |
| `body` | string | no | Plain-text body. Required to preview. Write it in full — the user must be able to read exactly what will be sent. |
| `confirm_token` | string | no | Only needed if a previous reply asked for one. Normally omit it — this sends in a single call. |


### `prospecx_send_whatsapp`

Send a WhatsApp message to a lead from the workspace's own paired number. THIS
REACHES A REAL PERSON IMMEDIATELY AND CANNOT BE RECALLED.

One call sends, with no confirmation step. WhatsApp lands on someone's phone,
so be MORE conservative here than with email, not less: show the user the
exact message in your reply and let them react before you call this.

Keep it short. A long WhatsApp message from an unknown number reads as spam
and can get the workspace's number restricted.

Refuses when no WhatsApp-capable number is on file or contacts are still
locked.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `lead_id` | string (uuid) | yes | Lead id from prospecx_search_leads. |
| `body` | string | no | The message. Required to preview. Keep it short — two or three sentences. |
| `confirm_token` | string | no | Only needed if a previous reply asked for one. Normally omit it. |


### `prospecx_enroll_in_sequence`

Put a lead into an automated follow-up sequence. ONE CALL SCHEDULES MULTIPLE
REAL MESSAGES OVER DAYS, sent unattended, with no further prompt.

This is the heaviest thing here. A single call commits the workspace to every
message in the cadence. Before calling it, tell the user how many messages it
is, roughly when they land, and that nobody will be asked again — then only
call it if they still want it.

The sequence stops automatically if the lead replies.

Templates: 'single' (1 message), 'soft_3step' (3, spaced), 'aggressive_5step'
(5, tighter). Default soft_3step. Do not pick aggressive without the user
asking for it.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `lead_id` | string (uuid) | yes | Lead id from prospecx_search_leads. |
| `template` | `soft_3step` \| `aggressive_5step` \| `single` | no | Cadence. Default 'soft_3step'. Default `soft_3step`. |
| `confirm_token` | string | no | Only needed if a previous reply asked for one. Normally omit it. |


---
