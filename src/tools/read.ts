/** Read-only tools. Free, safe, and never mutate anything. */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProspecxClient } from '../client.js';
import type { CreditSummary, Lead, Paginated } from '../types.js';
import { leadDetailMarkdown, leadsMarkdown, render } from '../format.js';
import { formatParam, guard, leadIdParam, limitParam, offsetParam } from './shared.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

export function registerReadTools(server: McpServer, client: ProspecxClient): void {
  server.registerTool(
    'prospecx_search_leads',
    {
      title: 'Search Prospecx leads',
      description: `Search the workspace's B2B leads by text, status, and minimum fit score.

Leads are people who posted something showing buying intent — hiring for a stack, asking for a vendor, announcing a project. Each carries a fit score (higher = better match for this workspace's ideal customer).

Use this FIRST whenever the user refers to leads in the abstract ("my best leads", "anyone hiring React"), because every other lead tool needs a lead id that only this returns.

Contact details are withheld unless that lead has been unlocked — a locked lead shows contact_locked: true and no email/phone keys. That is a billing state, not missing data.

Returns: matching leads with id, name, company, headline, status, score, LinkedIn URL, and lock state, plus pagination totals.

Does NOT search other workspaces, trashed leads, or the public internet.`,
      inputSchema: {
        query: z.string().min(1).max(200).optional()
          .describe("Free text matched against lead name and company, e.g. 'Acme' or 'Priya'. Omit to list without text filtering."),
        status: z.string().min(1).max(40).optional()
          .describe("Exact lead status to filter by, e.g. 'New'. Omit for all statuses."),
        score_min: z.number().int().min(0).max(100).optional()
          .describe('Minimum fit score, 0-100. Use 7+ for "best leads"; omit for everything.'),
        limit: limitParam,
        offset: offsetParam,
        response_format: formatParam,
      },
      annotations: READ_ONLY,
    },
    async ({ query, status, score_min, limit, offset, response_format }) =>
      guard(async () => {
        const page = await client.get<Paginated<Lead>>('/leads', { q: query, status, score_min, limit, offset });
        return render(page, response_format, () => leadsMarkdown(page, 'Leads'),
          'Add a `query`, raise `score_min`, or lower `limit` to see a focused set.');
      }),
  );

  server.registerTool(
    'prospecx_get_lead',
    {
      title: 'Get one Prospecx lead in full',
      description: `Fetch everything known about a single lead, including the original post that surfaced them, the intent read, notes, tags, and pipeline state.

Use this before drafting any outreach — the post text is what makes a message specific rather than generic.

Returns: full lead detail. Contact details appear only if the lead has been unlocked; otherwise contact_locked is true.

Requires a lead id from prospecx_search_leads. A lead belonging to another workspace returns a not-found error, never another workspace's data.`,
      inputSchema: { lead_id: leadIdParam, response_format: formatParam },
      annotations: READ_ONLY,
    },
    async ({ lead_id, response_format }) =>
      guard(async () => {
        const lead = await client.get<Lead>(`/leads/${lead_id}`);
        return render(lead, response_format, () => leadDetailMarkdown(lead));
      }),
  );

  server.registerTool(
    'prospecx_get_pipeline',
    {
      title: 'Get the Prospecx deal pipeline',
      description: `Summarise the workspace's pipeline: leads grouped by stage, with a count and total deal value per stage, and a sample of leads in each.

Use this for "how is my pipeline doing", forecasting, or finding which stage is clogged.

Returns: stages with count, total_value and sample leads, plus overall totals. Never includes contact details — this is a summary view.`,
      inputSchema: { response_format: formatParam },
      annotations: READ_ONLY,
    },
    async ({ response_format }) =>
      guard(async () => {
        const p = await client.get<{ stages: Array<Record<string, unknown>>; totals: Record<string, unknown> }>('/pipeline');
        return render(p, response_format, () => {
          const rows = (p.stages ?? []).map((s) =>
            `- **${String(s.stage)}** — ${String(s.count)} lead(s), value ${String(s.total_value ?? 0)}`);
          return `## Pipeline\n\n${rows.join('\n') || '_No leads in any stage yet._'}\n\nTotal: ${String(p.totals?.leads ?? 0)} leads, value ${String(p.totals?.value ?? 0)}`;
        });
      }),
  );

  server.registerTool(
    'prospecx_get_today_brief',
    {
      title: "Get today's Prospecx brief",
      description: `Get the workspace's daily digest: the moves worth making today, deals at risk, forecast, and coaching notes.

This is the best FIRST call for an open-ended question like "what should I do today", "what needs my attention", or "catch me up" — it is a curated answer rather than raw data you would have to rank yourself.

Returns: the digest as computed by Prospecx. Contents vary by workspace activity.`,
      inputSchema: { response_format: formatParam },
      annotations: READ_ONLY,
    },
    async ({ response_format }) =>
      guard(async () => {
        const brief = await client.get<{ data: unknown }>('/today');
        return render(brief, response_format, () => `## Today's brief\n\n\`\`\`json\n${JSON.stringify(brief.data, null, 2)}\n\`\`\``);
      }),
  );

  server.registerTool(
    'prospecx_get_account',
    {
      title: 'Get Prospecx points balance and prices',
      description: `Get the workspace's remaining points and the point cost of every chargeable action.

Call this BEFORE proposing anything that spends points, so you can tell the user what it will cost and whether they can afford it. Points are prepaid credit: unlocking contacts costs 1, deep research 2, Lead Lens 3.

Returns: balance and the full cost table.`,
      inputSchema: { response_format: formatParam },
      annotations: READ_ONLY,
    },
    async ({ response_format }) =>
      guard(async () => {
        const c = await client.get<CreditSummary>('/credits');
        return render(c, response_format, () => {
          const costs = Object.entries(c.costs ?? {}).map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v} point${v === 1 ? '' : 's'}`);
          return `## Account\n\n**Balance: ${c.balance} points**\n\nCosts:\n${costs.join('\n')}`;
        });
      }),
  );

  server.registerTool(
    'prospecx_get_lists',
    {
      title: 'Get Prospecx lead lists',
      description: `List the workspace's saved lead lists, or the leads inside one list.

Omit list_id to see all lists with their sizes. Pass list_id to see that list's leads.

Returns: lists with names and counts, or the leads in the named list (contact lock rules apply as everywhere else).`,
      inputSchema: {
        list_id: z.string().uuid().optional()
          .describe('A list id to open. Omit to see all lists first.'),
        response_format: formatParam,
      },
      annotations: READ_ONLY,
    },
    async ({ list_id, response_format }) =>
      guard(async () => {
        if (!list_id) {
          const r = await client.get<{ data: Array<Record<string, unknown>> }>('/lists');
          return render(r, response_format, () => {
            const rows = (r.data ?? []).map((l) => `- **${String(l.name)}** — ${String(l.item_count ?? 0)} lead(s) · id: \`${String(l.id)}\``);
            return `## Lead lists\n\n${rows.join('\n') || '_No lists yet. Create one with prospecx_manage_list._'}`;
          });
        }
        const page = await client.get<Paginated<Lead>>(`/lists/${list_id}/items`);
        return render(page, response_format, () => leadsMarkdown(page, 'Leads in list'));
      }),
  );
}
