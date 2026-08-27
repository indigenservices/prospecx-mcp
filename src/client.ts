/**
 * Thin HTTP client over the Prospecx public API v1.
 *
 * Its real job is not transport — it is turning API failures into messages an
 * agent can ACT on. "403 Forbidden" tells a model nothing; "this key lacks the
 * spend:points scope, mint a new key under Settings -> API keys" tells it both
 * what went wrong and what to do instead. Every failure mode below is mapped to
 * a next step.
 */
import { DEFAULT_API_BASE, REQUEST_TIMEOUT_MS, USER_AGENT } from './constants.js';
import type { ApiErrorBody } from './types.js';

/** A failure that already carries agent-readable remediation. */
export class ProspecxError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'ProspecxError';
  }
}

export class ProspecxClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string = DEFAULT_API_BASE) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
    return this.request<T>('GET', url.toString());
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', this.baseUrl + path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', this.baseUrl + path, body);
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      throw new ProspecxError(
        aborted
          ? `The request to Prospecx timed out after ${REQUEST_TIMEOUT_MS / 1000}s. Try again; if it keeps timing out, narrow the request (a smaller limit, or a more specific filter).`
          : `Could not reach Prospecx at ${this.baseUrl}. Check network access, and that PROSPECX_API_BASE (if set) points at a reachable host.`,
        0,
      );
    } finally {
      clearTimeout(timer);
    }

    if (res.ok) return (await res.json()) as T;

    let bodyJson: ApiErrorBody = {};
    try { bodyJson = (await res.json()) as ApiErrorBody; } catch { /* non-JSON error body */ }
    throw this.explain(res.status, bodyJson);
  }

  /** Map an HTTP failure to something the agent can act on. */
  private explain(status: number, body: ApiErrorBody): ProspecxError {
    const code = body.error;
    const detail = body.message ? ` (${body.message})` : '';

    // The dark-mount 404 is indistinguishable from a missing path by design, so
    // it MUST be called out — otherwise an agent reads "not found" and concludes
    // the lead does not exist, when in fact the whole API is switched off.
    if (status === 404 && code === 'Not found') {
      return new ProspecxError(
        'The Prospecx public API is not enabled for this account. Ask the workspace owner to enable API access, then retry. This is not a problem with your request.',
        status, code,
      );
    }
    if (status === 404) {
      return new ProspecxError(
        `Not found in this workspace${detail}. An API key can only see its own workspace's data — if you expected this record to exist, it likely belongs to a different workspace.`,
        status, code,
      );
    }
    if (status === 401) {
      return new ProspecxError(
        'The Prospecx API key was rejected. It is missing, malformed, revoked, or expired. Check the PROSPECX_API_KEY environment variable, and mint a fresh key under Settings -> API keys if needed. Do not retry with the same key.',
        status, code,
      );
    }
    if (status === 403 && code === 'insufficient_scope') {
      const scope = body.required_scope ?? 'the required scope';
      return new ProspecxError(
        `This API key does not carry the '${scope}' scope, so this action is impossible with it. Scopes are fixed when a key is created — mint a new key that includes '${scope}' under Settings -> API keys. Retrying will not help.`,
        status, code,
      );
    }
    if (status === 402) {
      return new ProspecxError(
        `Not enough points for this action${detail}. Report the shortfall to the user and suggest topping up; do not retry, and do not attempt a cheaper substitute without asking.`,
        status, code,
      );
    }
    if (status === 410) {
      return new ProspecxError(
        `That confirmation is no longer valid${detail}. Confirmations are single-use and expire after 5 minutes. Request a fresh preview and show the user the new details before confirming again — do NOT reuse a previous token.`,
        status, code,
      );
    }
    if (status === 429) {
      return new ProspecxError(
        code === 'point_cap_exceeded'
          ? `This API key has a daily point cap that will not allow this action${detail}. Tell the user; the cap is set on the key itself and cannot be raised from here.`
          : 'Rate limit reached for this API key (60 requests/minute). Wait about a minute before continuing, and batch work into fewer, larger requests.',
        status, code,
      );
    }
    if (status === 400) {
      return new ProspecxError(
        `Prospecx rejected the request as invalid${detail}. Re-read the tool's parameter descriptions and correct the arguments rather than retrying unchanged.`,
        status, code,
      );
    }
    if (status >= 500) {
      return new ProspecxError(
        `Prospecx returned a server error (${status})${detail}. This is not caused by your request. Retry once after a short pause; if it persists, tell the user.`,
        status, code,
      );
    }
    return new ProspecxError(`Prospecx request failed with status ${status}${detail}.`, status, code);
  }
}
