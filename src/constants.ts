/** Shared constants for the Prospecx MCP server. */

/** Default API base. Overridable so a self-hosted or staging deployment can be targeted. */
export const DEFAULT_API_BASE = 'https://prospecx.in/api/v1';

/**
 * Hard ceiling on a single tool response, in characters.
 *
 * An agent's context is the scarcest resource it has. A lead list that silently
 * grows to 40k characters does not just waste tokens — it crowds out the
 * conversation that gives the agent its purpose. Every formatter truncates to
 * this and says so explicitly, with the filter that would narrow the result.
 */
export const CHARACTER_LIMIT = 25_000;

/** Network timeout per request. */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Page size defaults. Deliberately small — an agent can always ask for more. */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const USER_AGENT = 'prospecx-mcp/1.0.0';
