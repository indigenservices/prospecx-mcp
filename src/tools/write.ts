/**
 * Safe writes. These change only the workspace's own records — no points are
 * spent and nothing is sent to anyone — so they execute in a single step.
 *
 * Both tools are deliberately WORKFLOW-shaped rather than endpoint-shaped.
 * "I just got off a call with them" is one human action, so it is one tool call
 * that can set a note, move the status and schedule the follow-up together,
 * instead of three round trips the model has to remember to chain.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProspecxClient } from '../client.js';
import { guard, leadIdParam } from './shared.js';

const SAFE_WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

export function registerWriteTools(server: McpServer, client: ProspecxClient): void {
  server.registerTool(
    'prospecx_annotate_lead',
    {
      title: 'Annotate a Prospecx lead',
      description: `Record what happened with a lead: leave a note, move its status, and/or set a follow-up reminder — in one call.

Costs nothing and sends nothing to the lead. Only the workspace's own record changes, so this is safe to use freely as a conversation progresses.

Pass any combination of the three fields; at least one is required. Typical use: after a call, set note + status + reminder together rather than making three separate calls.

IMPORTANT: notes REPLACE the existing note rather than appending. If you intend to add to an existing note, call prospecx_get_lead first, and send the combined text.

Returns: confirmation of each field that changed.`,
      inputSchema: {
        lead_id: leadIdParam,
        note: z.string().max(8000).optional()
          .describe('Replacement note text for this lead. REPLACES any existing note — read it first if you mean to append.'),
        status: z.string().min(1).max(40).optional()
          .describe("New status for the lead, e.g. 'Contacted', 'Qualified'. Match the workspace's existing vocabulary — check prospecx_get_lead to see what is in use."),
        remind_at: z.string().datetime().optional()
          .describe('ISO 8601 timestamp for a follow-up reminder, e.g. 2026-09-01T09:00:00Z. Must be in the future.'),
        reminder_note: z.string().max(500).optional()
          .describe('Short text shown with the reminder. Only meaningful alongside remind_at.'),
      },
      annotations: SAFE_WRITE,
    },
    async ({ lead_id, note, status, remind_at, reminder_note }) =>
      guard(async () => {
        if (note === undefined && status === undefined && remind_at === undefined) {
          return 'Nothing to do: pass at least one of `note`, `status` or `remind_at`. No change was made.';
        }
        const done: string[] = [];
        if (note !== undefined) {
          await client.patch(`/leads/${lead_id}/notes`, { notes: note });
          done.push('note updated');
        }
        if (status !== undefined) {
          await client.patch(`/leads/${lead_id}/status`, { status });
          done.push(`status set to ${status}`);
        }
        if (remind_at !== undefined) {
          await client.post(`/leads/${lead_id}/reminder`, { remind_at, note: reminder_note });
          done.push(`reminder set for ${remind_at}`);
        }
        return `Lead updated: ${done.join(', ')}.`;
      }),
  );

  server.registerTool(
    'prospecx_manage_list',
    {
      title: 'Create a Prospecx list or add leads to one',
      description: `Create a named lead list and/or add leads to it.

Costs nothing and sends nothing. Lists are the workspace's own saved groupings — a shortlist for a campaign, an account tier, a territory.

Pass name alone to create an empty list. Pass list_id with lead_ids to add to an existing one. Pass name WITH lead_ids to create the list and fill it in a single call, which is usually what a user means by "save these as a list".

Adding a lead that is already in the list is a no-op, not an error, so this is safe to retry.

Returns: the list, and how many leads were added.`,
      inputSchema: {
        name: z.string().min(1).max(80).optional()
          .describe('Name for a NEW list. Omit when adding to an existing list via list_id.'),
        list_id: z.string().uuid().optional()
          .describe('An EXISTING list id to add to. Get it from prospecx_get_lists. Omit when creating a new list.'),
        lead_ids: z.array(z.string().uuid()).max(100).optional()
          .describe('Lead ids to add, up to 100. Get them from prospecx_search_leads.'),
      },
      annotations: SAFE_WRITE,
    },
    async ({ name, list_id, lead_ids }) =>
      guard(async () => {
        if (!name && !list_id) {
          return 'Nothing to do: pass `name` to create a list, or `list_id` to add to one. No change was made.';
        }
        let targetId = list_id;
        let created = false;
        if (!targetId && name) {
          const list = await client.post<{ id: string }>('/lists', { name });
          targetId = list.id;
          created = true;
        }
        let added = 0;
        const failed: string[] = [];
        for (const id of lead_ids ?? []) {
          try {
            await client.post(`/lists/${targetId}/items`, { lead_id: id });
            added += 1;
          } catch (err) {
            // One bad id must not discard the whole batch — report it and continue.
            failed.push(id);
          }
        }
        const parts: string[] = [];
        if (created) parts.push(`Created list "${name}" (id: ${targetId})`);
        if (added) parts.push(`added ${added} lead${added === 1 ? '' : 's'}`);
        if (failed.length) parts.push(`could NOT add ${failed.length} (not in this workspace, or already removed): ${failed.join(', ')}`);
        return parts.join('. ') + '.';
      }),
  );
}
