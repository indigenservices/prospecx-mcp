---
name: prospecx-prospecting
description: Use when finding, filtering, ranking or triaging B2B leads in Prospecx — "find me leads", "who should I contact", "show me my best leads", "anyone hiring for X", "what should I do today". Covers search strategy, what the fit score actually means, and how to avoid wasting the user's points.
---

# Prospecting with Prospecx

Prospecx surfaces people who posted something showing buying intent — hiring for a
stack, asking for a vendor, announcing a project — and scores them for fit against
this workspace's ideal customer.

## Start in the right place

**Open-ended** ("what should I do today", "catch me up", "what needs attention")
→ `prospecx_get_today_brief` first. It is a curated answer, not raw data you have
to rank yourself. Only fall back to search if the brief is thin.

**Specific** ("leads hiring for React", "Shopify people", "my best leads")
→ `prospecx_search_leads`. Every other lead tool needs an id that only search
returns. Never invent a lead id.

**A named person or company already in the workspace** → search with `query`,
then `prospecx_get_lead` for the full record.

**A name or link that arrived from OUTSIDE Prospecx** — a referral, someone
spotted in a comment thread — is a different tool entirely. See "When the
person isn't in Prospecx yet" below before reaching for search.

## What the fit score means

0–10, higher is better. It is a match against the workspace's ICP, not a measure
of how likely they are to reply.

- **8–10** — strong match. Worth a personal message.
- **7** — the usual floor for "good leads". Use `score_min: 7` when the user says
  "best", "hot", or "top".
- **below 7** — only surface these if the user explicitly widens the net.

Do not promise a number of results before searching. If a filter returns little,
say so and offer to widen it rather than silently dropping the filter yourself.

## Searching well

`prospecx_search_leads` matches `query` against the lead's name and company —
NOT against the post text. So "hiring for React" as a query will mostly miss.
Instead:

- Filter on `score_min` and let the ICP scoring do the topical work.
- Use `query` for a company or person you already know by name.
- Page with `offset` rather than raising `limit` past what the user will read.

When the user asks for a topic ("web development", "Shopify"), search broadly with
a score floor, then read the returned headlines and post text and filter in your
own reasoning. Say that is what you did — do not imply the API filtered by topic.

## Showing a lead

`prospecx_get_lead` covers both cases, and renders differently depending on the
client: an interactive card with the score ring, intent meter and the original
post where that is supported, plain text everywhere else. Call it whenever the
user wants to LOOK at someone ("show me", "pull up", "what's the story with") or
you need the facts to reason with — there is only the one tool.

## Two searches, and only one of them is free

`prospecx_search_leads` looks through leads the workspace ALREADY HAS. It costs
nothing. Reach for it first, always.

`prospecx_find_new_leads` goes out and finds people the workspace has never
seen. It costs ONE POINT PER LEAD REQUESTED — asking for 15 spends 15 whether or
not all 15 turn out to be good. Only reach for it when search has genuinely come
back thin, and say the cost before calling it. Confusing the two is the single
most expensive mistake available in this workspace.

## When the person isn't in Prospecx yet

A name or LinkedIn link that arrives from OUTSIDE Prospecx — a referral, someone
in a comment thread, "what do you make of this person" — is neither of the
tools above. Use `prospecx_lookup_profile` with their LinkedIn URL. It costs 3
points, charged once per profile (looking the same person up again later is
free), and it adds them to the workspace as a real lead you can then draft to,
watch, or pipeline like anyone else.

Do not use `prospecx_find_new_leads` for a specific named person — that tool
searches by TOPIC, not by identity, and will not reliably find one individual.

## Contacts are locked until paid for

`contact_locked: true` means the workspace has not purchased that lead's contact
details. **It does not mean the lead has no email.** Never tell the user a lead
has no contact details when it is simply locked.

Unlocking costs points. See the `prospecx-outreach` skill before spending
anything.

## Triage that is actually useful

When asked to rank or shortlist, do not just sort by score. Read the post text and
say WHY each lead is worth attention — what they asked for, and what the user
could offer. A ranked list with no reasoning is worse than three leads with a
sentence each.

Finish by offering the obvious next step: save them to a list
(`prospecx_manage_list`), or draft an opener for the strongest one.

## Before triaging, check what has actually moved

`prospecx_get_radar` reports what watched leads have done recently — a genuine
signal, not just a static score. A lead who posted again last week is a better
bet than one sitting untouched at the same score for a month, and a triage that
ignores Radar is ranking on staleness it does not need to. If the user seems to
be starting their day, `prospecx_radar_check` runs this as a ready-made routine.
