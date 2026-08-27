/**
 * Agenda, workspace counters, and the two small writes that go with them
 * (deal updates, manual lead creation).
 *
 * The two read tools follow read.ts's shape exactly: markdown by default,
 * JSON on request, rendered through format.ts's render()/clamp() so a large
 * agenda degrades the same way a large lead list does. The two write tools
 * follow write.ts's shape: no response_format (a confirmation is prose, not
 * data to reformat), single-step, because neither spends a point or sends
 * anything to the lead -- only prospecx_unlock_lead_contacts (spend.ts) earns
 * the preview/confirm protocol.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProspecxClient } from '../client.js';
import type { Lead } from '../types.js';
import { render } from '../format.js';
import { formatParam, guard, leadIdParam } from './shared.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;
// update_deal is a plain setter -- calling it twice with the same arguments
// leaves the lead in the same state, so idempotentHint is honestly true here
// (contrast add_lead below, where a repeat call creates a second lead).
const IDEMPOTENT_WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;
const SAFE_WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

interface AgendaReminder {
  id: number;
  lead_id: string;
  lead_name: string | null;
  lead_company: string | null;
  remind_at: string;
  note: string | null;
  fired_at: string | null;
  created_at: string;
}
interface AgendaResponse { data: AgendaReminder[]; truncated: boolean }

interface InsightsSummary {
  total_leads: number;
  added_last_7_days: number;
  added_last_30_days: number;
  avg_score: number;
  unlocked_count: number;
  total_pipeline_value: number;
  by_status: Record<string, number>;
  by_icp_type: Record<string, number>;
}

interface DealResult {
  deal_value: number | null;
  deal_currency: string | null;
  pipeline_stage: string | null;
}

/** Group reminders by calendar day (from the ISO timestamp) and render each as a line. */
function agendaMarkdown(res: AgendaResponse, days: number): string {
  const { data, truncated } = res;
  if (!data.length) {
    return `## Follow-up agenda — next ${days} day${days === 1 ? '' : 's'}\n\nNothing due in this window.`;
  }
  const byDay = new Map<string, AgendaReminder[]>();
  for (const item of data) {
    const day = String(item.remind_at).slice(0, 10);
    const bucket = byDay.get(day);
    if (bucket) bucket.push(item);
    else byDay.set(day, [item]);
  }
  const sections = [...byDay.keys()].sort().map((day) => {
    const rows = byDay.get(day)!.map((item) => {
      const time = String(item.remind_at).slice(11, 16);
      const who = item.lead_name ?? 'Unnamed lead';
      const where = item.lead_company ? ` @ ${item.lead_company}` : '';
      const note = item.note ? ` — ${item.note}` : '';
      const fired = item.fired_at ? ' _(already fired)_' : '';
      return `- **${time}** ${who}${where}${note}${fired}\n  lead id: \`${item.lead_id}\``;
    });
    return `### ${day}\n${rows.join('\n')}`;
  });
  const notice = truncated
    ? `\n\n_Showing the earliest results only — narrow with a smaller \`days\` to see everything in range._`
    : '';
  return `## Follow-up agenda — next ${days} day${days === 1 ? '' : 's'}\n\n${sections.join('\n\n')}${notice}`;
}

function insightsMarkdown(s: InsightsSummary): string {
  const breakdown = (m: Record<string, number>) =>
    Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  - ${k}: ${v}`).join('\n') || '  _none_';
  return [
    `## Workspace insights`,
    ``,
    `- Total leads: ${s.total_leads}`,
    `- Added last 7 days: ${s.added_last_7_days} · last 30 days: ${s.added_last_30_days}`,
    `- Average fit score: ${s.avg_score}`,
    `- Contacts unlocked: ${s.unlocked_count} of ${s.total_leads}`,
    `- Total pipeline value: ${s.total_pipeline_value.toLocaleString()}`,
    ``,
    `**By status**`,
    breakdown(s.by_status),
    ``,
    `**By ICP type**`,
    breakdown(s.by_icp_type),
  ].join('\n');
}

export function registerInsightTools(server: McpServer, client: ProspecxClient): void {
  server.registerTool(
    'prospecx_get_agenda',
    {
      title: 'Get the Prospecx follow-up agenda',
      description: `List upcoming lead follow-up reminders, grouped by day, as a readable schedule.

Reminders are scheduled through prospecx_annotate_lead's remind_at field — this tool is how you read that schedule back, not how you set it.

Use this for "what's coming up", "any follow-ups this week", or before planning a day so scheduled work is not missed. Pair it with prospecx_get_today_brief for the fuller daily picture.

Do NOT use this to create, change, or cancel a reminder — that is prospecx_annotate_lead. This tool only reads.

By default shows the next 14 days and hides reminders that have already fired. Widen the window with \`days\` (up to 365), or pass \`include_fired: true\` to also see ones already sent — useful for reviewing what actually happened versus what was planned.

An overdue reminder that has not fired yet still appears, marked by its date being in the past — it is not hidden just because its time has passed; a missed follow-up is exactly the kind of thing this tool exists to surface.

Returns: a day-by-day schedule naming each lead, company, and note. Refuses nothing beyond normal input validation — this is a pure read and never modifies anything.`,
      inputSchema: {
        days: z.number().int().min(1).max(365).default(14)
          .describe('How many days ahead to look, 1-365 (default 14). Use 7 for "this week", 1 for "today".'),
        include_fired: z.boolean().default(false)
          .describe('Set true to also include reminders that already fired, e.g. to review what went out. Default false shows only what is still pending.'),
        response_format: formatParam,
      },
      annotations: READ_ONLY,
    },
    async ({ days, include_fired, response_format }) =>
      guard(async () => {
        const res = await client.get<AgendaResponse>('/reminders', {
          days, include_fired: include_fired ? 'true' : undefined,
        });
        return render(res, response_format, () => agendaMarkdown(res, days),
          'Lower `days` to see a narrower window.');
      }),
  );

  server.registerTool(
    'prospecx_get_insights',
    {
      title: 'Get Prospecx workspace insights',
      description: `Summarise this workspace's lead numbers: how many leads total, how fast they are arriving, the mix by status and ICP type, average fit score, how many have unlocked contacts, and total pipeline value.

Use this for "how are we doing", "give me the numbers", or as a quick health check before a standup. This is the COUNTERS view — for individual leads use prospecx_search_leads, and for the stage-by-stage deal board use prospecx_get_pipeline.

Returns: a short markdown summary with totals, 7/30-day growth, status and ICP breakdowns, average score, unlocked count, and total pipeline value.

Never includes any contact details (no email or phone appears anywhere in this tool's output) — it is aggregate counts only, computed from leads this workspace already owns. Refuses nothing beyond normal validation; there are no parameters to get wrong.`,
      inputSchema: { response_format: formatParam },
      annotations: READ_ONLY,
    },
    async ({ response_format }) =>
      guard(async () => {
        const s = await client.get<InsightsSummary>('/insights');
        return render(s, response_format, () => insightsMarkdown(s));
      }),
  );

  server.registerTool(
    'prospecx_update_deal',
    {
      title: "Update a lead's deal value, currency, or pipeline stage",
      description: `Set a lead's deal value, currency, and/or pipeline stage.

Costs nothing and sends nothing to the lead — only the workspace's own pipeline record changes. Use this after a call that produces a quote, when a deal size changes, or when a deal moves stage (e.g. to 'Qualified' or 'Won').

Pass any combination of deal_value, deal_currency, and pipeline_stage; at least one is required. A field you omit is left unchanged; passing deal_value as null explicitly CLEARS an existing value rather than leaving it alone.

Check prospecx_get_pipeline first if you are unsure what stage names this workspace already uses — match its existing vocabulary rather than inventing a new one, or the lead will not group with the rest of that stage.

Returns: the lead's deal_value, deal_currency, and pipeline_stage as they stand after the update. A lead belonging to another workspace, or that does not exist, is refused rather than silently doing nothing.`,
      inputSchema: {
        lead_id: leadIdParam,
        deal_value: z.number().min(0).max(1_000_000_000).nullable().optional()
          .describe('The deal size as a plain number, e.g. 50000. Pass null to clear an existing value. Omit to leave it unchanged.'),
        deal_currency: z.string().trim().min(1).max(8).optional()
          .describe("Currency code, e.g. 'INR' or 'USD'. Match what this workspace already uses -- check prospecx_get_lead if unsure."),
        pipeline_stage: z.string().trim().min(1).max(40).optional()
          .describe("New pipeline stage name, e.g. 'Qualified' or 'Won'. Match the workspace's existing vocabulary from prospecx_get_pipeline."),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ lead_id, deal_value, deal_currency, pipeline_stage }) =>
      guard(async () => {
        if (deal_value === undefined && deal_currency === undefined && pipeline_stage === undefined) {
          return 'Nothing to do: pass at least one of `deal_value`, `deal_currency` or `pipeline_stage`. No change was made.';
        }
        const r = await client.patch<DealResult>(`/leads/${lead_id}/deal`, { deal_value, deal_currency, pipeline_stage });
        const parts: string[] = [];
        if (deal_value !== undefined) parts.push(`value set to ${r.deal_value ?? 'none'}${r.deal_value != null && r.deal_currency ? ` ${r.deal_currency}` : ''}`);
        if (deal_currency !== undefined && deal_value === undefined) parts.push(`currency set to ${r.deal_currency}`);
        if (pipeline_stage !== undefined) parts.push(`stage set to ${r.pipeline_stage}`);
        return `Deal updated: ${parts.join(', ')}.`;
      }),
  );

  server.registerTool(
    'prospecx_add_lead',
    {
      title: 'Add a Prospecx lead manually',
      description: `Create a new lead by hand — for a referral, a business card, or anyone worth tracking that Prospecx did not surface on its own.

Costs nothing. The new lead starts with status 'New' and no unlocked contacts (there is nothing to unlock yet unless you add them separately) — prospecx_get_lead will show contact_locked: true for it.

Only \`name\` is required. If you pass \`linkedin_url\` and this workspace already has a lead with that URL, the call is refused rather than creating a duplicate — use prospecx_search_leads to find the existing one instead of retrying.

Do NOT use this for a lead Prospecx already found from a post — that would create a duplicate. Use this only for someone genuinely not already in the system.

Follow up with prospecx_annotate_lead to set status or a reminder, and prospecx_update_deal once deal size or stage is known.

Returns: the created lead in the same shape prospecx_search_leads uses, including its id for later calls.`,
      inputSchema: {
        name: z.string().trim().min(1).max(200)
          .describe("The lead's full name, e.g. 'Priya Sharma'. Required."),
        company: z.string().trim().max(200).optional()
          .describe("Company they work at, e.g. 'Acme Corp'."),
        headline: z.string().trim().max(300).optional()
          .describe("Their role or a one-line description, e.g. 'VP Engineering at Acme'."),
        linkedin_url: z.string().url().max(500).optional()
          .describe("Their LinkedIn profile URL, e.g. 'https://www.linkedin.com/in/priya-sharma'. Must not already exist in this workspace."),
        notes: z.string().max(8000).optional()
          .describe('Free-text context to save with the lead, e.g. how you met them.'),
      },
      annotations: SAFE_WRITE,
    },
    async ({ name, company, headline, linkedin_url, notes }) =>
      guard(async () => {
        const lead = await client.post<Lead>('/leads', { name, company, headline, linkedin_url, notes });
        return [
          `Lead created: **${lead.name}**${lead.company ? ` @ ${lead.company}` : ''}.`,
          `id: \`${lead.id}\``,
          ``,
          `Contacts: locked (none added yet). Use prospecx_annotate_lead or prospecx_update_deal to keep building this record.`,
        ].join('\n');
      }),
  );
}
