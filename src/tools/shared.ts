/** Helpers shared by every tool registration. */
import { z } from 'zod';
import { ProspecxError } from '../client.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants.js';

export const formatParam = z
  .enum(['markdown', 'json'])
  .default('markdown')
  .describe("Output format. 'markdown' (default) is readable prose for showing a user; 'json' is structured data when you need to process fields yourself.");

export const limitParam = z
  .number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE)
  .describe(`How many results to return, 1-${MAX_PAGE_SIZE} (default ${DEFAULT_PAGE_SIZE}). Prefer a small number; ask for more only if the user needs it.`);

export const offsetParam = z
  .number().int().min(0).default(0)
  .describe('How many results to skip, for paging. The previous response tells you the offset to use next.');

export const leadIdParam = z
  .string().uuid()
  .describe('The lead id, a UUID. Get it from prospecx_search_leads — never invent one.');

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

export function ok(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

/**
 * Wrap a tool body so failures come back as readable guidance instead of a stack
 * trace. ProspecxError already carries remediation (see client.ts); anything else
 * is unexpected and is reported as such rather than dressed up as a normal result.
 */
export async function guard(fn: () => Promise<string>): Promise<ToolResult> {
  try {
    return ok(await fn());
  } catch (err) {
    if (err instanceof ProspecxError) {
      return { content: [{ type: 'text', text: err.message }], isError: true };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `Unexpected error in the Prospecx MCP server: ${msg}. This is a bug in the server, not in your request — report it rather than retrying.` }],
      isError: true,
    };
  }
}
