# Things worth asking

Prospecx works best when you talk to it the way you would talk to a colleague
who knows your pipeline. You never need to name a tool — the assistant picks
them. These are grouped by what you are actually trying to do.

The four **slash-command prompts** (`/prospecx_daily_standup` and friends) are
listed at the bottom; everything above is plain conversation.

---

## Starting a session

> What should I do today in Prospecx?

> Catch me up — what changed since Friday?

> What can Prospecx do?

The first Prospecx question in a conversation runs `prospecx_start_here`, which
reports your workspace as it actually is and suggests moves built from that
state. An empty workspace gets told to go find leads; a busy one gets told who
to call.

---

## Finding people

> Find leads hiring for React with a fit score above 8.

> Anyone posting about switching CRMs this week?

> Show me the highest-scoring leads I have not contacted yet.

> Search my leads for anyone at a logistics company.

Leads are people who **posted something showing buying intent** — hiring for a
stack, asking for a vendor, complaining about a tool. The fit score is how well
they match your ideal customer, not how likely they are to reply.

---

## Reading one lead

> Pull up everything on the founder at Brightfold.

> What did they actually post?

> Why is this one scored 9?

`prospecx_get_lead` returns the original post, the intent read, notes, tags and
pipeline state. Contact details stay hidden until the lead is unlocked — that is
a billing state, not missing data.

---

## Writing outreach

> Draft an email to Aanya.

> Write me a short opener — mention we met at the Bangalore meetup.

> Draft it in Hinglish.

> Give me a cold call script for this one.

One call returns **all four channels**: email subject and body, a WhatsApp
message, a LinkedIn DM, and a 30-second call script with objection handles. Each
is anchored on the post that surfaced the lead, which is what stops it reading
as a template.

Drafts cost nothing and send nothing. The LinkedIn DM is text you copy across —
Prospecx has no LinkedIn send path.

---

## Spending points

> How many points do I have?

> Unlock her contacts.

> Run deep research on the top three and tell me the total first.

Anything that costs points previews first. You will see the exact cost and the
resulting balance before anything is charged, and the assistant has to come back
to you before confirming. Unlocking a lead that is already unlocked is free.

---

## Sending

> Send that draft to her.

> WhatsApp them the short version.

> Put them in the four-touch follow-up sequence.

Same contract: you see the exact subject and body first. The server guarantees
the send matches what you approved. A lead whose contacts are still locked
cannot be emailed — unlock first.

---

## Keeping the pipeline honest

> Log that I called her — no answer, try Tuesday.

> This one is worth about 3 lakh, move them to negotiation.

> Add Priya from Zeta — a referral from Anand.

> Save these five as a list called "Q4 logistics".

> Who did I say I would follow up with this week?

---

## Slash commands

Clients that support MCP prompts show these in a menu.

| Command | What it does | Arguments |
|---|---|---|
| `prospecx_daily_standup` | Turns today's brief into a prioritised plan | none |
| `prospecx_prep_call` | A one-page brief before you dial: who they are, the post quoted back, three grounded questions, one risk | `lead` |
| `prospecx_write_outreach` | An opener under 90 words, grounded in the post | `lead`, `angle?` |
| `prospecx_triage_inbox` | Ranks open leads into reply today / worth a look / let it cool, and flags overdue follow-ups | none |

---

## What it will refuse

Worth knowing so a refusal does not read as a bug:

- **Inventing a lead id.** Every lead tool needs an id from a search. It will
  search rather than guess.
- **Spending or sending in one step.** Even if you said "yes" earlier about
  something else, it previews and asks again.
- **Emailing a locked lead.** You have not paid for that address yet.
- **Sending on LinkedIn.** There is no API for it. You get text to paste.
- **Reaching another workspace's data.** A lead id from elsewhere returns
  not-found, never someone else's record.
