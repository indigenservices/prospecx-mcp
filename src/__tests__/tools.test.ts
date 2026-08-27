/**
 * These drive the server through a REAL MCP client over an in-memory transport,
 * so they exercise the actual protocol — schema validation, annotations, the
 * content envelope — rather than poking at the SDK's private registry.
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../server.js';
import { ProspecxClient } from '../client.js';
import { clamp, leadLine } from '../format.js';
import { CHARACTER_LIMIT } from '../constants.js';

const LEAD = '11111111-1111-4111-8111-111111111111';
const fetchMock = vi.fn();

beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); });

async function connect() {
  const server = buildServer(new ProspecxClient('px_live_k', 'https://example.test/api/v1'));
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '1.0.0' });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  return client;
}

function reply(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body } as any);
}
const textOf = (r: any): string => r.content[0].text;

describe('tool surface', () => {
  test('advertises exactly the intended tools, all namespaced', async () => {
    const { tools } = await (await connect()).listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'prospecx_add_lead',
      'prospecx_annotate_lead',
      'prospecx_get_account',
      'prospecx_get_agenda',
      'prospecx_get_insights',
      'prospecx_get_lead',
      'prospecx_get_lists',
      'prospecx_get_pipeline',
      'prospecx_get_today_brief',
      'prospecx_manage_list',
      'prospecx_search_leads',
      'prospecx_unlock_lead_contacts',
      'prospecx_update_deal',
    ]);
    // Comfortably under the ~40 where tool-selection accuracy starts to degrade.
    expect(names.length).toBeLessThanOrEqual(20);
    for (const n of names) expect(n.startsWith('prospecx_')).toBe(true);
  });

  test('annotations mark reads read-only and the spend destructive', async () => {
    const { tools } = await (await connect()).listTools();
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    for (const n of ['prospecx_search_leads', 'prospecx_get_lead', 'prospecx_get_pipeline', 'prospecx_get_today_brief', 'prospecx_get_account', 'prospecx_get_lists']) {
      expect(byName[n]!.annotations?.readOnlyHint, n).toBe(true);
      expect(byName[n]!.annotations?.destructiveHint, n).toBe(false);
    }
    // This is what makes a client prompt before spending the user's money.
    expect(byName['prospecx_unlock_lead_contacts']!.annotations?.destructiveHint).toBe(true);
    // Safe writes must NOT be destructive, or clients nag on every note.
    expect(byName['prospecx_annotate_lead']!.annotations?.destructiveHint).toBe(false);
  });

  test('descriptions are substantial enough to guide tool selection', async () => {
    const { tools } = await (await connect()).listTools();
    for (const t of tools) expect(String(t.description).length, t.name).toBeGreaterThan(180);
    const spend = tools.find((t) => t.name === 'prospecx_unlock_lead_contacts')!;
    expect(spend.description).toContain('SPENDS');
    expect(spend.description).toContain('TWO STEPS');
    expect(spend.description).toMatch(/expires in 5 minutes/);
  });

  test('a bad argument is rejected by schema validation, not passed through to the API', async () => {
    const client = await connect();
    const res: any = await client.callTool({ name: 'prospecx_get_lead', arguments: { lead_id: 'not-a-uuid' } });
    expect(res.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('the spend tool cannot charge on its first call', () => {
  test('with no confirm_token it previews, and sends no token upstream', async () => {
    reply({
      preview: { description: 'Reveal verified contact details for this lead.', lead_name: 'Asha R', company_name: 'Acme' },
      cost_points: 1, balance_after: 26, confirm_token: 'cf_abc', expires_at: '2026-08-27T13:00:00Z',
    });
    const res: any = await (await connect()).callTool({
      name: 'prospecx_unlock_lead_contacts', arguments: { lead_id: LEAD, kind: 'contacts' },
    });
    const text = textOf(res);
    expect(text).toContain('NOTHING HAS BEEN CHARGED YET');
    expect(text).toContain('cf_abc');
    expect(text).toContain('1 point');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ kind: 'contacts' });
  });

  test('an already-unlocked lead reports zero charge rather than implying a spend', async () => {
    reply({ ok: true, lead_id: 'x', already_unlocked: true, credits_spent: 0, balance: 26 });
    const res: any = await (await connect()).callTool({
      name: 'prospecx_unlock_lead_contacts', arguments: { lead_id: LEAD, kind: 'contacts', confirm_token: 'cf_abc' },
    });
    expect(textOf(res)).toContain('nothing was charged');
  });

  test('a scope failure comes back as guidance with isError, not a thrown stack', async () => {
    reply({ error: 'insufficient_scope', required_scope: 'spend:points' }, 403);
    const res: any = await (await connect()).callTool({
      name: 'prospecx_unlock_lead_contacts', arguments: { lead_id: LEAD, kind: 'contacts' },
    });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('spend:points');
  });
});

describe('safe writes', () => {
  test('a no-op call fires no requests and says so', async () => {
    const res: any = await (await connect()).callTool({ name: 'prospecx_annotate_lead', arguments: { lead_id: LEAD } });
    expect(textOf(res)).toContain('Nothing to do');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('note, status and reminder apply together in one call', async () => {
    reply({ ok: true }); reply({ ok: true }); reply({ ok: true });
    const res: any = await (await connect()).callTool({
      name: 'prospecx_annotate_lead',
      arguments: { lead_id: LEAD, note: 'Called, keen', status: 'Contacted', remind_at: '2026-09-01T09:00:00.000Z' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const t = textOf(res);
    expect(t).toContain('note updated');
    expect(t).toContain('status set to Contacted');
    expect(t).toContain('reminder set');
  });

  test('one bad lead id does not discard the rest of a list batch', async () => {
    reply({ id: 'list-1' });                       // create list
    reply({ ok: true });                            // lead 1 added
    reply({ error: 'lead_not_found' }, 404);        // lead 2 rejected
    const res: any = await (await connect()).callTool({
      name: 'prospecx_manage_list',
      arguments: { name: 'Hot', lead_ids: [LEAD, '22222222-2222-4222-8222-222222222222'] },
    });
    const t = textOf(res);
    expect(t).toContain('added 1 lead');
    expect(t).toContain('could NOT add 1');
  });
});

describe('prompts and resources — the parts a client actually SHOWS', () => {
  test('prompts are advertised, so they appear as slash commands', async () => {
    const { prompts } = await (await connect()).listPrompts();
    const names = prompts.map((p) => p.name).sort();
    expect(names).toEqual(['prospecx_daily_standup', 'prospecx_prep_call', 'prospecx_write_outreach']);
    for (const p of prompts) expect(p.title, p.name).toBeTruthy();
  });

  test('a prompt renders a real instruction, not an empty shell', async () => {
    const res = await (await connect()).getPrompt({ name: 'prospecx_prep_call', arguments: { lead: 'Asha at Acme' } });
    const text = (res.messages[0]!.content as { text: string }).text;
    expect(text).toContain('Asha at Acme');
    expect(text).toContain('prospecx_get_lead');
    // A prep prompt must never quietly spend the user's points.
    expect(text).toMatch(/do NOT unlock without asking/i);
  });

  test('the outreach prompt forbids sending', async () => {
    const res = await (await connect()).getPrompt({ name: 'prospecx_write_outreach', arguments: { lead: 'Asha' } });
    const text = (res.messages[0]!.content as { text: string }).text;
    expect(text).toMatch(/do NOT send/i);
  });

  test('static resources still list even when the API is down', async () => {
    // No fetch mocked: the lead-template's list callback will fail. The static
    // entries must survive that, or one flaky call blanks the whole attach menu.
    const { resources } = await (await connect()).listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain('prospecx://today');
    expect(uris).toContain('prospecx://leads/hot');
  });

  test('a lead resource template is advertised so leads can be attached by id', async () => {
    const { resourceTemplates } = await (await connect()).listResourceTemplates();
    expect(resourceTemplates.map((t) => t.uriTemplate)).toContain('prospecx://lead/{leadId}');
  });

  test('reading a lead resource returns the rendered lead, not raw JSON', async () => {
    reply({ id: 'lead-1', name: 'Asha R', company: 'Acme', headline: 'CTO', status: 'New', score: 8, created_at: '', linkedin_url: null, contact_locked: true });
    const res = await (await connect()).readResource({ uri: 'prospecx://lead/lead-1' });
    const text = String((res.contents[0] as { text: string }).text);
    expect(text).toContain('Asha R');
    expect(text).toContain('locked');
  });
});

describe('context defence', () => {
  test('truncation is announced with a way to narrow, never silent', () => {
    const out = clamp('x'.repeat(CHARACTER_LIMIT + 5000), 'Add a `query` to narrow it.');
    expect(out.length).toBeLessThanOrEqual(CHARACTER_LIMIT);
    expect(out).toContain('Response truncated');
    expect(out).toContain('NOT seeing every result');
  });

  test('a locked lead explains WHY contacts are absent', () => {
    const line = leadLine({ id: 'a', name: 'Asha', headline: null, company: 'Acme', status: 'New', score: 8, created_at: '', linkedin_url: null, contact_locked: true });
    expect(line).toContain('locked');
    expect(line).toContain('prospecx_unlock_lead_contacts');
  });
});
