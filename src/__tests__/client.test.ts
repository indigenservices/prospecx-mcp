import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProspecxClient, ProspecxError } from '../client.js';

const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); });

function reply(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body } as any);
}
const client = () => new ProspecxClient('px_live_test_key', 'https://example.test/api/v1');

describe('ProspecxClient auth + transport', () => {
  test('sends the key as a bearer token', async () => {
    reply(200, { ok: true });
    await client().get('/leads');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer px_live_test_key');
  });

  test('builds query params and drops undefined ones', async () => {
    reply(200, { ok: true });
    await client().get('/leads', { q: 'acme', score_min: 7, status: undefined, limit: 10 });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('q=acme');
    expect(url).toContain('score_min=7');
    expect(url).toContain('limit=10');
    expect(url).not.toContain('status');
  });
});

describe('errors are actionable, not just diagnostic', () => {
  test('the dark-mount 404 is NOT reported as a missing record', async () => {
    reply(404, { error: 'Not found' });
    const err = await client().get('/leads').catch((e) => e as ProspecxError);
    // This is the trap: the API is switched off, but it looks identical to a
    // missing lead. An agent must not conclude the lead does not exist.
    expect(err.message).toContain('not enabled');
    expect(err.message).toContain('not a problem with your request');
  });

  test('a genuine 404 explains workspace scoping', async () => {
    reply(404, { error: 'lead_not_found', message: 'No such lead in this workspace.' });
    const err = await client().get('/leads/x').catch((e) => e as ProspecxError);
    expect(err.message).toContain('different workspace');
  });

  test('401 tells the agent to stop retrying', async () => {
    reply(401, { error: 'invalid_api_key' });
    const err = await client().get('/leads').catch((e) => e as ProspecxError);
    expect(err.message).toContain('PROSPECX_API_KEY');
    expect(err.message).toContain('Do not retry');
  });

  test('403 names the missing scope and says retrying will not help', async () => {
    reply(403, { error: 'insufficient_scope', required_scope: 'spend:points' });
    const err = await client().get('/leads').catch((e) => e as ProspecxError);
    expect(err.message).toContain('spend:points');
    expect(err.message).toContain('Retrying will not help');
  });

  test('410 forbids reusing a stale confirm token', async () => {
    reply(410, { error: 'confirm_token_invalid' });
    const err = await client().post('/leads/x/unlock').catch((e) => e as ProspecxError);
    expect(err.message).toContain('single-use');
    expect(err.message).toMatch(/do NOT reuse/i);
  });

  test('402 tells the agent not to silently substitute a cheaper action', async () => {
    reply(402, { error: 'insufficient_points', message: 'costs 2; balance is 0' });
    const err = await client().post('/leads/x/unlock').catch((e) => e as ProspecxError);
    expect(err.message).toContain('do not retry');
    expect(err.message).toContain('cheaper substitute');
  });

  test('a point cap is distinguished from a plain rate limit', async () => {
    reply(429, { error: 'point_cap_exceeded' });
    const capped = await client().post('/x').catch((e) => e as ProspecxError);
    expect(capped.message).toContain('daily point cap');
    reply(429, { error: 'rate_limited' });
    const limited = await client().get('/x').catch((e) => e as ProspecxError);
    expect(limited.message).toContain('Rate limit');
  });

  test('a network failure names the base URL rather than leaking a stack', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const err = await client().get('/leads').catch((e) => e as ProspecxError);
    expect(err).toBeInstanceOf(ProspecxError);
    expect(err.message).toContain('https://example.test/api/v1');
  });
});
