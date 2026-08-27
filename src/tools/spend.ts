/**
 * Point-spending tools. These are the ones that can cost the user real money,
 * so they are two-phase by construction: a call WITHOUT a confirm token only
 * previews, and the token that comes back is the sole thing that can execute.
 *
 * The server enforces this — the token maps to the payload that was previewed,
 * so a second call cannot redirect the spend at a different lead. The tool
 * description below exists to make the model surface the preview to the human,
 * which is the part no server-side check can enforce.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProspecxClient } from '../client.js';
import type { SpendPreview, SpendResult } from '../types.js';
import { guard, leadIdParam } from './shared.js';

const SPENDS_MONEY = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true } as const;

export function registerSpendTools(server: McpServer, client: ProspecxClient): void {
  server.registerTool(
    'prospecx_unlock_lead_contacts',
    {
      title: 'Unlock a lead\'s contact details (spends points)',
      description: `Reveal verified contact details for a lead, or run deep research on them. THIS SPENDS THE USER'S PREPAID POINTS.

TWO STEPS, ALWAYS. This is not optional and cannot be skipped:

  1. Call WITHOUT confirm_token. Nothing is charged. You get back the exact cost, the resulting balance, and a confirm_token.
  2. Show the user that cost and ask them. Only if they say yes, call again with confirm_token.

Never call with a confirm_token the user has not agreed to. Never chain both steps in one turn without the user answering in between. If the user said "unlock the top 3", preview each one and present all three costs before confirming any.

The token is single-use and expires in 5 minutes. It is bound to the lead it was previewed for, so it cannot be reused for a different lead — a stale or wrong token fails safely rather than charging for the wrong thing. If it expires, preview again and re-confirm with the user; do NOT treat re-previewing as approval.

kind='contacts' (1 point) reveals verified email and phone.
kind='deep_research' (2 points) builds a research dossier on the person and company.

Unlocking a lead that is already unlocked is free and returns already_unlocked: true, so an accidental repeat costs nothing.

Returns: on step 1, a preview with cost_points, balance_after and confirm_token. On step 2, the result with credits_spent and the new balance.`,
      inputSchema: {
        lead_id: leadIdParam,
        kind: z.enum(['contacts', 'deep_research']).default('contacts')
          .describe("'contacts' (1 point) for verified email and phone; 'deep_research' (2 points) for a full dossier."),
        confirm_token: z.string().optional()
          .describe('ONLY pass this on the second call, after the user has seen the previewed cost and explicitly approved. Use the exact token from the preview. Omit it to preview.'),
      },
      annotations: SPENDS_MONEY,
    },
    async ({ lead_id, kind, confirm_token }) =>
      guard(async () => {
        if (!confirm_token) {
          const p = await client.post<SpendPreview>(`/leads/${lead_id}/unlock`, { kind });
          const pv = p.preview as Record<string, unknown>;
          return [
            `### Confirmation needed — this will spend points`,
            ``,
            `**Action:** ${String(pv.description ?? 'Unlock lead')}`,
            `**Lead:** ${String(pv.lead_name ?? lead_id)}${pv.company_name ? ` @ ${String(pv.company_name)}` : ''}`,
            `**Cost:** ${p.cost_points} point${p.cost_points === 1 ? '' : 's'}`,
            `**Balance afterwards:** ${p.balance_after}`,
            ``,
            `NOTHING HAS BEEN CHARGED YET. Show the user the cost above and ask whether to proceed.`,
            `If and only if they agree, call this tool again with:`,
            ``,
            `    confirm_token: "${p.confirm_token}"`,
            ``,
            `That token expires at ${p.expires_at} and works once.`,
          ].join('\n');
        }

        const r = await client.post<SpendResult>(`/leads/${lead_id}/unlock`, { kind, confirm_token });
        if (r.already_unlocked) {
          return `This lead was already unlocked, so nothing was charged. Balance unchanged at ${r.balance} points. Use prospecx_get_lead to read the contact details.`;
        }
        return `Unlocked. Charged ${r.credits_spent} point${r.credits_spent === 1 ? '' : 's'}; ${r.balance} remaining. Use prospecx_get_lead to read the contact details.`;
      }),
  );
}
