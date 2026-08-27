/** Shared types for the Prospecx MCP server. */

/** Output shape a tool renders. Markdown for reading, JSON for further processing. */
export type ResponseFormat = 'markdown' | 'json';

export interface Lead {
  id: string;
  name: string | null;
  headline: string | null;
  company: string | null;
  status: string | null;
  score: number | null;
  created_at: string;
  linkedin_url: string | null;
  contact_locked: boolean;
  email?: string | null;
  phone?: string | null;
  [k: string]: unknown;
}

export interface Paginated<T> {
  data: T[];
  pagination: { limit: number; offset: number; total: number };
}

export interface CreditSummary {
  balance: number;
  costs: Record<string, number>;
}

/** The preview half of a two-phase dangerous operation. */
export interface SpendPreview {
  preview: Record<string, unknown>;
  cost_points: number;
  balance_after: number;
  confirm_token: string;
  expires_at: string;
}

export interface SpendResult {
  ok: true;
  lead_id: string;
  already_unlocked: boolean;
  credits_spent: number;
  balance: number;
}

/** An error body the API returns. Every field is optional — never trust the shape. */
export interface ApiErrorBody {
  error?: string;
  message?: string;
  required_scope?: string;
  issues?: unknown;
}
