/**
 * Response formatting. Two jobs: render for humans, and defend the agent's
 * context window.
 *
 * Every formatter is truncation-aware. Silently cutting a list is worse than
 * useless — the agent believes it saw everything and reasons from a partial
 * picture. So a truncated response always says what was dropped AND names the
 * argument that would have narrowed it.
 */
import { CHARACTER_LIMIT } from './constants.js';
import type { Lead, Paginated, ResponseFormat } from './types.js';

/** Clamp any rendered text to the character budget with an explicit, actionable notice. */
export function clamp(text: string, narrowingHint: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  const keep = CHARACTER_LIMIT - 400;
  return (
    text.slice(0, keep) +
    `\n\n---\n**Response truncated** at ${CHARACTER_LIMIT.toLocaleString()} characters — you are NOT seeing every result. ` +
    `Do not draw conclusions about totals from what is shown. ${narrowingHint}`
  );
}

export function render(
  payload: unknown,
  format: ResponseFormat,
  markdown: () => string,
  narrowingHint = 'Narrow the request and try again.',
): string {
  return format === 'json'
    ? clamp(JSON.stringify(payload, null, 2), narrowingHint)
    : clamp(markdown(), narrowingHint);
}

function money(v: unknown, currency: unknown): string {
  if (v === null || v === undefined) return '—';
  const n = typeof v === 'string' ? Number(v) : (v as number);
  if (!Number.isFinite(n)) return '—';
  return `${(currency as string) || 'INR'} ${n.toLocaleString()}`;
}

/** One lead as a compact markdown block. */
export function leadLine(l: Lead): string {
  const bits: string[] = [];
  bits.push(`**${l.name ?? 'Unnamed lead'}**`);
  if (l.company) bits.push(`@ ${l.company}`);
  if (typeof l.score === 'number') bits.push(`· score ${l.score}`);
  if (l.status) bits.push(`· ${l.status}`);

  const lines = [`- ${bits.join(' ')}`];
  if (l.headline) lines.push(`  ${l.headline}`);

  // Say WHY contacts are absent. An agent that sees no email should know whether
  // the lead has none or whether it simply has not been paid for.
  lines.push(
    l.contact_locked
      ? `  contacts: locked — unlock with prospecx_unlock_lead_contacts (1 point)`
      : `  email: ${l.email ?? 'none on file'} · phone: ${l.phone ?? 'none on file'}`,
  );
  lines.push(`  id: \`${l.id}\``);
  return lines.join('\n');
}

export function leadsMarkdown(page: Paginated<Lead>, heading: string): string {
  const { data, pagination } = page;
  if (!data.length) {
    return `## ${heading}\n\nNo leads matched. Try removing a filter, lowering \`score_min\`, or broadening \`query\`.`;
  }
  const shown = pagination.offset + data.length;
  const more =
    shown < pagination.total
      ? `\n\nShowing ${pagination.offset + 1}–${shown} of ${pagination.total}. For the next page pass \`offset: ${shown}\`.`
      : `\n\nShowing all ${pagination.total} matching lead${pagination.total === 1 ? '' : 's'}.`;
  return `## ${heading}\n\n${data.map(leadLine).join('\n')}${more}`;
}

export function leadDetailMarkdown(l: Lead): string {
  const out: string[] = [`## ${l.name ?? 'Unnamed lead'}`];
  if (l.headline) out.push(`_${l.headline}_`);
  out.push('');
  out.push(`- Company: ${l.company ?? '—'}`);
  out.push(`- Status: ${l.status ?? '—'} · Score: ${l.score ?? '—'}`);
  if (l.pipeline_stage) out.push(`- Pipeline stage: ${l.pipeline_stage}`);
  if (l.deal_value != null) out.push(`- Deal value: ${money(l.deal_value, l.deal_currency)}`);
  if (l.linkedin_url) out.push(`- LinkedIn: ${l.linkedin_url}`);
  out.push(
    l.contact_locked
      ? `- Contacts: **locked** — unlock with prospecx_unlock_lead_contacts (1 point)`
      : `- Email: ${l.email ?? 'none on file'} · Phone: ${l.phone ?? 'none on file'}`,
  );
  if (l.intent_label) out.push(`- Intent: ${l.intent_label}${l.intent_summary ? ` — ${l.intent_summary}` : ''}`);
  if (Array.isArray(l.tags) && l.tags.length) out.push(`- Tags: ${(l.tags as string[]).join(', ')}`);
  if (l.notes) out.push(`\n**Notes**\n${l.notes}`);
  if (l.post_text) {
    out.push(`\n**The post that surfaced this lead**${l.post_date ? ` (${String(l.post_date).slice(0, 10)})` : ''}`);
    out.push(`> ${String(l.post_text).replace(/\n/g, '\n> ')}`);
    if (l.post_url) out.push(`\n${l.post_url}`);
  }
  out.push(`\nid: \`${l.id}\``);
  return out.join('\n');
}
