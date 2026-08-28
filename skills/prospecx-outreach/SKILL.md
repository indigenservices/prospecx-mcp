---
name: prospecx-outreach
description: Use before spending Prospecx points or contacting a lead — unlocking contacts, deep research, drafting outreach, sending email or WhatsApp, enrolling a sequence, or when the user asks "how much will that cost". Covers the two-step confirmation contract, which tool drafts versus which sends, and how to write an opener that does not read as a template.
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

## Drafting: use the tool, do not freehand it

`prospecx_draft_outreach` writes all four channels at once — email subject and
body, a WhatsApp message, a LinkedIn DM, and a 30-second call script with
objection handles — each anchored on the post that surfaced the lead. It costs
nothing, it sends nothing, and it is cached for 24 hours and shared with the
Prospecx app, so what you show is what the user already sees in the product.

Reach for it before writing anything by hand. Pass `context` to steer the angle
("mention we met at the Bangalore meetup"), `language` for Hinglish or Hindi, and
`force: true` to rewrite a cached draft.

**LinkedIn is copy-and-paste.** Prospecx cannot send on LinkedIn and LinkedIn
exposes no DM API. Hand the user the DM text; never offer to send it.

## Judging a draft, or writing one yourself

Read the lead first — `prospecx_get_lead`. The post that surfaced them is the
whole point: it is the one thing that makes the message impossible to have sent
to anyone else.

- Ground it in that post. Quote or paraphrase the specific thing they said.
- Under 90 words.
- No "I hope this finds you well". No flattery. No "I came across your profile".
- One clear ask, and make it small.
- Match the language the user writes in — English, Hindi and Hinglish are all in
  use here.

Show the draft. Do not send anything unless the user explicitly asks, and even
then the send goes through the same two-step confirmation.

## Sending

| Tool | Reaches | Requires |
|---|---|---|
| `prospecx_send_email` | Their inbox, from the workspace's connected mailbox | Contacts already unlocked |
| `prospecx_send_whatsapp` | Their phone | An unlocked phone number |
| `prospecx_enroll_in_sequence` | Their inbox, repeatedly, on a schedule | The sequence id |

All three follow the two-step contract above. The server guarantees the send
matches the preview; only you can guarantee a human actually read it, so put the
exact subject and body in front of the user before you pass a token back.

A lead whose contacts are still locked cannot be emailed — that is deliberate,
not a bug. Unlock first (1 point, previewed), or pick someone already unlocked.

## After a conversation

Record it with `prospecx_annotate_lead` — note, status and a follow-up reminder in
one call. Note that the note REPLACES any existing note, so read the lead first if
you mean to append.
