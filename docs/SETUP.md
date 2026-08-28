# Setup

One URL, no API key:

```
https://prospecx.in/api/mcp
```

You sign in with your Prospecx account and approve what the assistant may do.
Nothing is stored on your side, and you can cut it off at any time from
**Settings → MCP** in the Prospecx dashboard.

---

## Claude Cowork

Cowork treats Prospecx as a custom remote connector.

1. **Customize → Connectors → + → Add custom connector**
2. Paste the URL above and click **Add**
3. Sign in with your Prospecx account
4. On the consent screen, tick the scopes you want. Read scopes are enough to
   search, brief and draft. Tick `spend:points` and `send:outreach` only if you
   want the assistant to unlock contacts and message people.

On Team and Enterprise plans an owner adds the connector once under
**Organization settings → Connectors**; members then authenticate it under
**Customize → Connectors**.

### Stopping it asking on every call

This is the thing most people want to fix, and it is a client setting, not
something the server controls.

Each tool sits in one of three stances — **Always allow**, **Needs approval**,
or **Blocked** — under **Customize → Connectors → Prospecx → Tool permissions**.

A sensible split:

| Stance | Tools |
|---|---|
| **Always allow** | `prospecx_start_here`, `prospecx_get_today_brief`, `prospecx_search_leads`, `prospecx_get_lead`, `prospecx_get_pipeline`, `prospecx_get_insights`, `prospecx_get_agenda`, `prospecx_get_account`, `prospecx_get_lists`, `prospecx_draft_outreach` |
| **Needs approval** | `prospecx_unlock_lead_contacts`, `prospecx_send_email`, `prospecx_send_whatsapp`, `prospecx_enroll_in_sequence` |
| Your call | `prospecx_annotate_lead`, `prospecx_update_deal`, `prospecx_add_lead`, `prospecx_manage_list` |

Everything in the first row is read-only or writes a draft. None of them costs a
point, sends anything, or changes a record you would miss. Every tool ships an
accurate MCP annotation (`readOnlyHint`, `destructiveHint`) so a client that
sorts tools by risk gets this split for free.

**The two-step confirmation is separate and stays on regardless.** Setting a
spend tool to "Always allow" removes your client's *approval popup*, not the
server's contract: the first call still previews and charges nothing, and only a
second call carrying a confirmation token does anything. See
[SECURITY.md](SECURITY.md).

If "Allow all for this task" is greyed out for a custom connector, that is a
known Cowork bug rather than anything in this server —
[anthropics/claude-ai-mcp#491](https://github.com/anthropics/claude-ai-mcp/issues/491).
Setting the per-tool stances above is the way around it today.

---

## Claude (desktop or web)

**Settings → Connectors → Add custom connector**, paste the URL, sign in,
approve.

Enable it per conversation with the **+** button → **Connectors**. Inside a
conversation, the search-and-tools menu turns individual tools off for that
conversation.

---

## Claude Code

```bash
claude mcp add --transport http prospecx https://prospecx.in/api/mcp
```

Then `/mcp` to authenticate. Claude Code renders tool results as text — the
interactive cards need a client with MCP Apps support.

---

## Cursor

**Settings → MCP → Add new MCP server**, type **HTTP**, URL as above. Approve in
the browser window it opens.

---

## Anything else

Any client speaking MCP over Streamable HTTP with OAuth works. Discovery is
standard:

```
GET https://prospecx.in/.well-known/oauth-protected-resource
GET https://prospecx.in/.well-known/oauth-authorization-server
```

Dynamic client registration is open, so a client that supports it needs no
pre-registration. Details in [AUTH.md](AUTH.md).

---

## Without OAuth — the stdio package

For a client that cannot do OAuth, or for local work:

```bash
npx @prospecx/mcp
```

Needs `PROSPECX_API_KEY`, created at **Settings → API keys**. It ships 13 of the
18 tools — see [LOCAL.md](LOCAL.md).

---

## Checking it worked

Ask:

> What should I do today in Prospecx?

You should get your actual pipeline back. If the assistant instead describes
Prospecx generically, it has not called the connector — check it is enabled for
that conversation.

In the Prospecx dashboard, **Settings → MCP** shows every connected client, the
scopes it was granted, when it was last used, which tools it has been calling,
and a **Disconnect** button that takes effect immediately — even mid-conversation
and even though the token has not expired.

---

## When something is wrong

**"Not connected" in the dashboard after connecting.** The row is written when a
token is issued. If you cancelled at the consent screen, no token was issued.
Reconnect and approve.

**Tools missing.** You granted narrower scopes than the tool needs. Reconnect and
tick the ones you want — the tool will tell you which it wanted.

**"This connection was disconnected from the Prospecx dashboard."** Someone
pressed Disconnect. Reconnecting through the consent screen restores it.

**A send is refused for a lead you can see.** Contacts are pay-per-lead. Prospecx
will not fall back to an address the workspace has not unlocked.

**No interactive cards.** The client does not implement MCP Apps. The same facts
come back as text; nothing is lost.
