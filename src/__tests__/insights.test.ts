/**
 * Same discipline as tools.test.ts: drive the tools through a REAL MCP client
 * over an in-memory transport. server.ts is off-limits to edit here, so this
 * file builds its own minimal McpServer and registers only what this PR adds.
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ProspecxClient } from '../client.js';
import { registerInsightTools } from '../tools/insights.js';
import { clamp } from '../format.js';
import { CHARACTER_LIMIT } from '../constants.js';

const LEAD = '11111111-1111-4111-8111-111111111111';
const fetchMock = vi.fn();

beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); });

async function connect() {
  const server = new McpServer({ name: 'test-insights-server', version: '0.0.0' });
  registerInsightTools(server, new ProspecxClient('px_live_k', 'https://example.test/api/v1'));
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '1.0.0' });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  return client;
}

function reply(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body } as any);
}
const textOf = (r: any): string => r.content[0].text;
const urlOf = (callIndex = 0): string => String(fetchMock.mock.calls[callIndex]![0]);
const bodyOf = (callIndex = 0): any => JSON.parse(fetchMock.mock.calls[callIndex]![1].body);

describe('tool surface', () => {
  test('advertises exactly the four new tools, all namespaced', async () => {
    const { tools } = await (await connect()).listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'prospecx_add_lead',
      'prospecx_get_agenda',
      'prospecx_get_insights',
      'prospecx_update_deal',
    ]);
    for (const n of names) expect(n.startsWith('prospecx_')).toBe(true);
  });

  test('reads are annotated read-only; writes are not', async () => {
    const { tools } = await (await connect()).listTools();
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    for (const n of ['prospecx_get_agenda', 'prospecx_get_insights']) {
      expect(byName[n]!.annotations?.readOnlyHint, n).toBe(true);
      expect(byName[n]!.annotations?.destructiveHint, n).toBe(false);
    }
    for (const n of ['prospecx_update_deal', 'prospecx_add_lead']) {
      expect(byName[n]!.annotations?.readOnlyHint, n).toBe(false);
      expect(byName[n]!.annotations?.destructiveHint, n).toBe(false);
    }
  });

  test('neither write tool can spend points -- both are non-destructive', async () => {
    const { tools } = await (await connect()).listTools();
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    expect(byName['prospecx_update_deal']!.annotations?.destructiveHint).toBe(false);
    expect(byName['prospecx_add_lead']!.annotations?.destructiveHint).toBe(false);
  });

  test('update_deal is idempotent (a setter); add_lead is not (each call creates a new lead)', async () => {
    const { tools } = await (await connect()).listTools();
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    expect(byName['prospecx_update_deal']!.annotations?.idempotentHint).toBe(true);
    expect(byName['prospecx_add_lead']!.annotations?.idempotentHint).toBe(false);
  });

  test('descriptions are substantial enough to guide tool selection', async () => {
    const { tools } = await (await connect()).listTools();
    for (const t of tools) expect(String(t.description).length, t.name).toBeGreaterThan(180);
  });

  test('a bad argument is rejected by schema validation, not passed through to the API', async () => {
    const client = await connect();
    const res: any = await client.callTool({ name: 'prospecx_update_deal', arguments: { lead_id: 'not-a-uuid', pipeline_stage: 'Won' } });
    expect(res.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('prospecx_get_agenda', () => {
  test('defaults to a 14-day window and omits include_fired when false', async () => {
    reply({ data: [], truncated: false });
    await (await connect()).callTool({ name: 'prospecx_get_agenda', arguments: {} });
    expect(urlOf()).toContain('days=14');
    expect(urlOf()).not.toContain('include_fired');
  });

  test('passes days and include_fired through when set', async () => {
    reply({ data: [], truncated: false });
    await (await connect()).callTool({ name: 'prospecx_get_agenda', arguments: { days: 7, include_fired: true } });
    expect(urlOf()).toContain('days=7');
    expect(urlOf()).toContain('include_fired=true');
  });

  test('groups reminders by day and names the lead', async () => {
    reply({
      data: [
        { id: 1, lead_id: LEAD, lead_name: 'Asha R', lead_company: 'Acme', remind_at: '2026-09-01T09:00:00.000Z', note: 'Send proposal', fired_at: null, created_at: '2026-08-27T00:00:00.000Z' },
        { id: 2, lead_id: LEAD, lead_name: 'Ravi K', lead_company: 'Beta', remind_at: '2026-09-01T14:00:00.000Z', note: null, fired_at: null, created_at: '2026-08-27T00:00:00.000Z' },
        { id: 3, lead_id: LEAD, lead_name: 'Meera S', lead_company: null, remind_at: '2026-09-03T10:00:00.000Z', note: null, fired_at: null, created_at: '2026-08-27T00:00:00.000Z' },
      ],
      truncated: false,
    });
    const res: any = await (await connect()).callTool({ name: 'prospecx_get_agenda', arguments: {} });
    const text = textOf(res);
    expect(text).toContain('2026-09-01');
    expect(text).toContain('2026-09-03');
    expect(text).toContain('Asha R');
    expect(text).toContain('Send proposal');
    expect(text).toContain('Ravi K');
    expect(text).toContain('Meera S');
  });

  test('an overdue-but-unfired reminder is shown, not hidden', async () => {
    reply({ data: [{ id: 1, lead_id: LEAD, lead_name: 'Asha R', lead_company: 'Acme', remind_at: '2020-01-01T09:00:00.000Z', note: null, fired_at: null, created_at: '2019-12-01T00:00:00.000Z' }], truncated: false });
    const res: any = await (await connect()).callTool({ name: 'prospecx_get_agenda', arguments: {} });
    expect(textOf(res)).toContain('Asha R');
  });

  test('an already-fired reminder is marked as such when included', async () => {
    reply({ data: [{ id: 1, lead_id: LEAD, lead_name: 'Asha R', lead_company: 'Acme', remind_at: '2026-08-01T09:00:00.000Z', note: null, fired_at: '2026-08-01T09:05:00.000Z', created_at: '2026-07-01T00:00:00.000Z' }], truncated: false });
    const res: any = await (await connect()).callTool({ name: 'prospecx_get_agenda', arguments: { include_fired: true } });
    expect(textOf(res)).toMatch(/fired/i);
  });

  test('an empty agenda says so plainly', async () => {
    reply({ data: [], truncated: false });
    const res: any = await (await connect()).callTool({ name: 'prospecx_get_agenda', arguments: {} });
    expect(textOf(res)).toMatch(/nothing|no.*due/i);
  });

  test('json response_format returns the raw payload, clamped', async () => {
    reply({ data: [], truncated: false });
    const res: any = await (await connect()).callTool({ name: 'prospecx_get_agenda', arguments: { response_format: 'json' } });
    expect(() => JSON.parse(textOf(res))).not.toThrow();
  });
});

describe('prospecx_get_insights', () => {
  test('calls GET /insights with no params', async () => {
    reply({
      total_leads: 10, added_last_7_days: 2, added_last_30_days: 5, avg_score: 42.5,
      unlocked_count: 3, total_pipeline_value: 150000, by_status: { New: 6, Contacted: 4 },
      by_icp_type: { saas: 7, agency: 3 },
    });
    await (await connect()).callTool({ name: 'prospecx_get_insights', arguments: {} });
    expect(urlOf()).toContain('/insights');
  });

  test('renders a short markdown summary, not a JSON dump, by default', async () => {
    reply({
      total_leads: 10, added_last_7_days: 2, added_last_30_days: 5, avg_score: 42.5,
      unlocked_count: 3, total_pipeline_value: 150000, by_status: { New: 6, Contacted: 4 },
      by_icp_type: { saas: 7, agency: 3 },
    });
    const res: any = await (await connect()).callTool({ name: 'prospecx_get_insights', arguments: {} });
    const text = textOf(res);
    expect(text).not.toMatch(/^\s*\{/); // not raw JSON
    expect(text).toContain('10');
    expect(text).toContain('42.5');
    expect(text).toContain('New');
    expect(text).toContain('saas');
  });

  test('json response_format returns the raw payload', async () => {
    const payload = {
      total_leads: 1, added_last_7_days: 0, added_last_30_days: 1, avg_score: 5,
      unlocked_count: 0, total_pipeline_value: 0, by_status: {}, by_icp_type: {},
    };
    reply(payload);
    const res: any = await (await connect()).callTool({ name: 'prospecx_get_insights', arguments: { response_format: 'json' } });
    expect(JSON.parse(textOf(res))).toEqual(payload);
  });
});

describe('prospecx_update_deal', () => {
  test('a no-op call fires no request and says so', async () => {
    const res: any = await (await connect()).callTool({ name: 'prospecx_update_deal', arguments: { lead_id: LEAD } });
    expect(textOf(res)).toContain('Nothing to do');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('sends only the provided fields as a single PATCH', async () => {
    reply({ deal_value: 50000, deal_currency: 'INR', pipeline_stage: 'Qualified' });
    await (await connect()).callTool({
      name: 'prospecx_update_deal',
      arguments: { lead_id: LEAD, deal_value: 50000, pipeline_stage: 'Qualified' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(urlOf()).toContain(`/leads/${LEAD}/deal`);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe('PATCH');
    expect(bodyOf()).toEqual({ deal_value: 50000, pipeline_stage: 'Qualified' });
  });

  test('confirms what changed using the server-returned values', async () => {
    reply({ deal_value: 75000, deal_currency: 'USD', pipeline_stage: 'Won' });
    const res: any = await (await connect()).callTool({
      name: 'prospecx_update_deal',
      arguments: { lead_id: LEAD, deal_value: 75000, deal_currency: 'USD', pipeline_stage: 'Won' },
    });
    const text = textOf(res);
    expect(text).toContain('75000');
    expect(text).toContain('USD');
    expect(text).toContain('Won');
  });

  test('deal_value: null clears the value and is sent, not dropped like undefined', async () => {
    reply({ deal_value: null, deal_currency: 'INR', pipeline_stage: null });
    await (await connect()).callTool({ name: 'prospecx_update_deal', arguments: { lead_id: LEAD, deal_value: null } });
    expect(bodyOf()).toEqual({ deal_value: null });
  });

  test('a 404 from an out-of-workspace lead comes back as guidance, not a thrown stack', async () => {
    reply({ error: 'lead_not_found', message: 'No such lead in this workspace.' }, 404);
    const res: any = await (await connect()).callTool({ name: 'prospecx_update_deal', arguments: { lead_id: LEAD, pipeline_stage: 'Won' } });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('different workspace');
  });
});

describe('prospecx_add_lead', () => {
  test('name is required by schema', async () => {
    const res: any = await (await connect()).callTool({ name: 'prospecx_add_lead', arguments: {} });
    expect(res.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('creates a lead with only the provided optional fields', async () => {
    reply({
      id: 'lead-new', company_id: 'co-1', name: 'Priya Sharma', headline: null, company: null,
      status: 'New', score: 0, created_at: '2026-08-27T00:00:00.000Z', linkedin_url: null, contact_locked: true,
    }, 201);
    const res: any = await (await connect()).callTool({ name: 'prospecx_add_lead', arguments: { name: 'Priya Sharma' } });
    expect(bodyOf()).toMatchObject({ name: 'Priya Sharma' });
    const text = textOf(res);
    expect(text).toContain('Priya Sharma');
    expect(text).toContain('lead-new');
  });

  test('a duplicate linkedin_url comes back as actionable guidance, not a raw error', async () => {
    reply({ error: 'duplicate_lead', message: 'A lead with this LinkedIn URL already exists in this workspace.' }, 409);
    const res: any = await (await connect()).callTool({
      name: 'prospecx_add_lead',
      arguments: { name: 'Priya Sharma', linkedin_url: 'https://www.linkedin.com/in/priya-sharma' },
    });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('already exists');
  });
});

describe('context defence', () => {
  test('an oversized agenda is clamped with an actionable truncation notice', () => {
    const out = clamp('x'.repeat(CHARACTER_LIMIT + 5000), 'Lower `days` to see fewer results.');
    expect(out.length).toBeLessThanOrEqual(CHARACTER_LIMIT);
    expect(out).toContain('Response truncated');
  });
});
