# Tool reference

Generated from the live connector's `tools/list`, not written from memory —
so the arguments below are the ones the server actually validates.

**38 tools.** Every one is listed; nothing is hidden behind a flag.

> Spending and sending complete in a SINGLE call. There is no confirmation
> step — see [SECURITY.md](SECURITY.md) for what still protects you.

> A daily point ceiling (default 50) bounds what the connector can spend,
> whatever the balance. `prospecx_get_account` reports what is left of it.

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

Remaining points, the cost of every chargeable action, and how much of today's
connector spending allowance is left.

Call BEFORE proposing anything that spends. Two numbers matter and they are
different: the BALANCE is what the workspace owns, and the DAILY ALLOWANCE is
how much of it this connection may spend today. Hitting the allowance is not
the same as running out of points, and telling a user they are out of points
when they are not is a bad way to be wrong.

_No arguments._


### `prospecx_get_lists`

The workspace's saved lead lists, or the leads inside one. Omit list_id for
all lists; pass it to open one.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `list_id` | string (uuid) | no | A list id to open. Omit to see all lists first. |


---

## Radar — what your watched leads just did

### `prospecx_get_radar`

Which leads the workspace is WATCHING, and what those leads have done recently
— new posts, job changes, and other signals Radar detected.

This is the "has anything moved since I last looked" question, and it is
usually the right first call of a morning alongside prospecx_get_today_brief.
A signal here means a real person did something real, recently: it is a far
better reason to reach out than a high score alone.

Free. Watching is separate from the lead being in the pipeline — a watched
lead is one someone decided to keep an eye on.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `signal_limit` | integer | no | How many recent signals to return. Default 20. Default `20`. |


### `prospecx_watch_lead`

Put a lead on Radar so Prospecx checks their LinkedIn on a schedule and
reports when they post something new — or take them off it.

Use it when the user says a lead is interesting but not ready: "keep an eye on
her", "tell me when they post again", "stop watching him". Costs nothing.

Watching needs a LinkedIn URL on the lead; if there is none this refuses
rather than silently doing nothing. Watching an already-watched lead just
updates the cadence.

Watch slots are limited by plan, so do not watch leads speculatively — pick
the ones the user actually named.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `lead_id` | string (uuid) | yes | Lead id from prospecx_search_leads. |
| `action` | `watch` \| `unwatch` | no | 'watch' to start, 'unwatch' to stop. Default `watch`. |
| `cadence` | `daily` \| `weekly` \| `biweekly` | no | How often to check. Default weekly. Only meaningful when watching. Default `weekly`. |


---

## Meetings — calls, transcripts and minutes

### `prospecx_get_meetings`

Calls on the calendar, with the lead each one is about. Use for "what am I
doing today", "who am I meeting this week", or — with past: true — "what did
we discuss last time".

Past meetings may carry a transcript and minutes if a notetaker attended. When
they do, prospecx_get_meeting returns them, which is the difference between
walking into a call prepared and guessing.

Free.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `days` | integer | no | How far ahead (or back) to look. Default 14. Default `14`. |
| `past` | boolean | no | true for meetings that already happened. Default `False`. |


### `prospecx_get_meeting`

Everything recorded about a single meeting: who it was with, the transcript if
a notetaker attended, the minutes, and any scope of work that came out of it.

Use this before a follow-up call, or when the user asks what was agreed.
Quoting what someone actually said last time is the difference between a
follow-up that lands and one that reads as generic.

Needs a meeting id from prospecx_get_meetings. Free.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `meeting_id` | string (uuid) | yes | Meeting id from prospecx_get_meetings. |


---

## Proposals — what you quoted and who read it

### `prospecx_get_proposals`

Every proposal the workspace has raised, with whether it was sent, whether the
lead OPENED it, and whether they accepted.

The viewed_at field is the useful one: a proposal sent three days ago and
never opened is a different conversation from one opened four times. Use this
for "what is outstanding", "did they read it", "what have I quoted".

Free. Pass lead_id to narrow to one lead.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `lead_id` | string (uuid) | no | Narrow to one lead. Omit for all. |
| `status` | string | no | Filter by status, e.g. 'sent' or 'accepted'. |


### `prospecx_get_proposal`

The full text of a proposal — scope, pricing and body — plus whether it has
been sent, opened or accepted. Use before following up on one, so the follow-
up refers to what was actually quoted. Free.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `proposal_id` | string (uuid) | yes | Proposal id from prospecx_get_proposals. |


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

## Spend — costs points, charged on the first call

### `prospecx_find_new_leads`

Go and find NEW people who have posted buying intent, and add them to the
workspace. THIS SPENDS ONE POINT PER LEAD REQUESTED, immediately.

This is different from prospecx_search_leads, and confusing the two is
expensive. search_leads looks through leads the workspace ALREADY has and is
free. This one goes out and finds people it has never seen, and bills for
every one it looks for — asking for 20 costs 20 points whether or not all 20
turn out to be good.

Use it when the user wants people they do not have yet: "find me some new
leads", "who is hiring React this week", "go look for logistics founders in
Dubai". Search the existing leads FIRST — the answer is often already in the
workspace, and free.

Say the cost before calling. Default to a small number: 10 is a real search,
25 is a big one. Do not raise the limit because the first run returned few
results; that usually means the query was wrong, not too small.

Takes up to two minutes and reports progress while it runs. The leads it finds
land in the workspace and are searchable afterwards.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `query` | string | yes | What to look for, in plain words — "hiring a shopify developer", "needs a 3PL partner". This is matched against what people posted, so describe the SIGNAL, not the job title. |
| `limit` | integer | no | How many to look for. COSTS ONE POINT EACH. Default 10. Keep it small unless the user asked for more. Default `10`. |
| `location` | string | no | Narrow by place, e.g. "India" or "Dubai". |
| `industry` | string | no | Narrow by industry. |
| `title` | string | no | Narrow by job title, e.g. "Founder". |


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

## Lead Lens — bring in someone from outside Prospecx

### `prospecx_lookup_profile`

Paste a LinkedIn profile URL and get the person: their real headline and
company, verified contact details, work history, and an AI dossier on what
they are likely to care about. THIS SPENDS 3 POINTS.

Use it when a NAME OR LINK ARRIVES FROM OUTSIDE Prospecx — a referral, someone
spotted in a comment thread, "what do you make of this person". If they are
already in the workspace, `prospecx_search_leads` finds them for free; check
that first.

Charged once per profile. Looking the same person up again is free, so do not
avoid re-checking someone whose situation may have changed.

The person is added to the workspace afterwards and behaves like any other
lead — you can draft to them, watch them, or put them in the pipeline.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `url` | string | yes | A LinkedIn profile URL, e.g. https://www.linkedin.com/in/someone. Company pages and post links do not work. |


---

## X Leads — candidates sourced from X, staged for review

A separate lead source from everything above: people who posted buying-intent
on X (Twitter), matched against an identity with a confidence score. Off by
default — `prospecx_xleads_status` reports zeros for a workspace that hasn't
turned it on, which is a real answer, not an error.

### `prospecx_xleads_status`

Whether this workspace has X Leads turned on, and how many candidates sit in
each stage: unmatched, needs_review, matched, promoted, rejected.

_No arguments._


### `prospecx_xleads_candidates`

Candidates X Leads found, filtered by stage — defaults to needs_review, the
actual work queue: a real person posted buying-intent, and the identity match
needs a human (or you) to confirm it's the right person before it becomes a
lead.

Each candidate carries the original post, an intent score, and how confident
the identity match is. Read the post before approving — a confident name match
on the wrong person is worse than an unmatched one.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `status` | `needs_review` \| `unmatched` \| `matched` \| `promoted` \| `rejected` \| `all` | no | Stage to filter by. Default `needs_review`. |
| `limit` | integer | no | Max candidates to return, 1-100. Default `30`. |


### `prospecx_xleads_get`

The full record for one candidate: the original post, why it scored the way it
did, and every identity match candidate considered — not just the one picked.
Use before approving or rejecting one you are unsure about.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `candidate_id` | string (uuid) | yes | Candidate id from `prospecx_xleads_candidates`. |


### `prospecx_xleads_approve`

Confirms the identity match on a candidate and promotes it to a real lead in
the workspace — from then on it behaves like any lead found through search:
draftable, watchable, pipeline-able.

Only call this after reading the candidate (`prospecx_xleads_get`) and being
genuinely confident it's the right person — approving the wrong match creates
a real, wrong lead. If the candidate has no matched LinkedIn URL yet, pass one
explicitly or this refuses.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `candidate_id` | string (uuid) | yes | Candidate id from `prospecx_xleads_candidates`. |
| `linkedin_url` | string | no | Override or supply the LinkedIn URL, if the candidate doesn't already have a matched one. |


### `prospecx_xleads_reject`

Marks a candidate rejected — wrong identity match, or a real match but not
actually a buyer. It stays queryable (never deleted) but drops out of the
review queue. Cannot be undone through this tool.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `candidate_id` | string (uuid) | yes | Candidate id from `prospecx_xleads_candidates`. |


---

## Freelance — the gig-bidding pipeline

Freelancer.com projects, discovered and scored the same way leads are — a
completely separate pipeline (`gig_leads`, not `leads`). Read-only here on
purpose: submitting a bid, running autopilot, or messaging a client puts real
money and a real message in front of a real person on an external platform, so
those stay in the app, not in an unattended tool call.

### `prospecx_freelance_status`

Whether this workspace has the Freelance panel turned on, whether a
Freelancer.com account is connected, and a quick count of the current feed by
status.

_No arguments._


### `prospecx_freelance_dashboard`

The numbers a manager checks first: gigs bid on and still open, how many won
vs lost, bids placed this week vs last, and the total USD-fair value of
everything currently shortlisted or bid on.

_No arguments._


### `prospecx_freelance_search_gigs`

Gigs discovered for this workspace, filterable and sorted. Each result carries
a fit score, an opportunity X-Ray verdict (green/amber/red — winnability and
scam-risk heuristics), and whether the connected profile's skills make it
biddable. This only reads what discovery already found — it does not search
Freelancer.com live.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `q` | string | no | Text search over title, description and client name. |
| `status` | `new` \| `shortlisted` \| `drafted` \| `bid` \| `skipped` \| `won` \| `lost` \| `all` | no | Feed status. Default `new`. |
| `sort` | `fit` \| `recent` \| `budget` \| `bids` \| `closing` | no | Default `fit`. |
| `min_fit` | integer | no | Only gigs at or above this fit score (0-100). |
| `safe_only` | boolean | no | Hide gigs the X-Ray flags red. Default `false`. |
| `skills` | string | no | Comma-separated skills to require, e.g. "React,Node.js". |
| `limit` | integer | no | Max gigs to return, 1-60. Default `20`. |


### `prospecx_freelance_get_gig`

The full listing for one gig plus its X-Ray: winnability signals, risk flags,
a suggested bid, and whether the connected profile can bid on it at all.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `gig_id` | string (uuid) | yes | Gig id from `prospecx_freelance_search_gigs`. |


### `prospecx_freelance_win_ready`

The curated set: open gigs with a high win-score (fit + winnability + low
competition combined), scam-risk and unbiddable ones already excluded. The
"what should I actually bid on today" answer, not the raw feed.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `limit` | integer | no | Max gigs to return, 1-50. Default `15`. |
| `min_score` | integer | no | Override the win-score floor (there is a sensible default). |


### `prospecx_freelance_my_bids`

Every bid this workspace has submitted, with its current state: shortlisted,
pending, won, or lost. The warm-pipeline tracker.

_No arguments._


### `prospecx_freelance_skill_gap`

For each skill the connected profile does NOT have, how many currently-open
gigs it would unlock and their combined USD value — ranked by value, so the
top of the list is the highest-leverage skill to add on Freelancer.com. A pure
read over already-discovered gigs; does not call Freelancer.com live.

_No arguments._


---
