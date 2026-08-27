---
name: prospecx-outreach
description: Use before spending Prospecx points or contacting a lead — unlocking contacts, deep research, drafting or sending outreach, or when the user asks "how much will that cost". Covers the two-step confirmation contract and how to write an opener that does not read as a template.
---

# Spending and outreach in Prospecx

Two kinds of action here cost the user real money or reach a real person. Both
have a hard contract, and neither may be short-circuited.

## Check the balance before proposing a spend

Call `prospecx_get_account` first. It returns the balance and the price of every
chargeable action. Tell the user the cost in the same breath as the suggestion:

> "Unlocking Asha's contacts costs 1 point — you have 1,832. Want me to?"

Never propose a spend without knowing whether they can afford it.

## The two-step contract — this is not optional

Anything that spends points or sends a message runs in two calls:

1. Call the tool **without** `confirm_token`. Nothing is charged. You get back the
   exact cost, the resulting balance, and a single-use token.
2. **Show the user that preview and get a real answer.** Then, and only then, call
   again with the token.

Rules that follow from this:

- Never chain both calls in one turn. A turn where you preview and confirm without
  the user speaking in between is a violation, even if they said "yes" earlier
  about something else.
- "Unlock the top 3" means preview all three and present the total before
  confirming any.
- The token expires in 5 minutes and works once. If it expires, preview again and
  **re-ask** — a fresh preview is not standing approval.
- The token is bound to the lead it was previewed for, so it cannot be reused for
  a different one. Do not try.

## Costs

| Action | Cost |
|---|---|
| Unlock verified contacts | 1 point |
| Deep research dossier | 2 points |
| Lead Lens | 3 points |

Unlocking a lead that is already unlocked is free and returns
`already_unlocked: true` — so an accidental repeat costs nothing. Say so rather
than implying they were charged.

## Writing an opener

Read the lead first — `prospecx_get_lead` or `prospecx_show_lead`. The post that
surfaced them is the whole point: it is the one thing that makes the message
impossible to have sent to anyone else.

- Ground it in that post. Quote or paraphrase the specific thing they said.
- Under 90 words.
- No "I hope this finds you well". No flattery. No "I came across your profile".
- One clear ask, and make it small.
- Match the language the user writes in — English, Hindi and Hinglish are all in
  use here.

Show the draft. Do not send anything unless the user explicitly asks, and even
then the send goes through the same two-step confirmation.

## After a conversation

Record it with `prospecx_annotate_lead` — note, status and a follow-up reminder in
one call. Note that the note REPLACES any existing note, so read the lead first if
you mean to append.
