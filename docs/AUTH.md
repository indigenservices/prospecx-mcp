# Authorization

The connector is an OAuth 2.1 protected resource. It implements the MCP
authorization spec: [RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728)
protected-resource metadata, [RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414)
authorization-server metadata, [RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591)
dynamic client registration, PKCE S256,
[RFC 8707](https://www.rfc-editor.org/rfc/rfc8707.html) resource indicators, and
[RFC 9207](https://datatracker.ietf.org/doc/html/rfc9207) `iss` in the
authorization response.

## Endpoints

| Purpose | URL |
|---|---|
| Resource | `https://prospecx.in/api/mcp` |
| Protected-resource metadata | `https://prospecx.in/.well-known/oauth-protected-resource/api/mcp` |
| Authorization-server metadata | `https://prospecx.in/.well-known/oauth-authorization-server` |
| Dynamic client registration | `https://prospecx.in/register` |
| Authorize | `https://prospecx.in/api/mcp/authorize` |
| Token | `https://prospecx.in/api/mcp/token` |

## The flow

1. Client POSTs `/api/mcp` with no token → **401** with
   `WWW-Authenticate: Bearer resource_metadata="…", scope="…"`.
2. Client reads the protected-resource metadata, then the authorization-server
   metadata.
3. Client registers itself at `/register` (public client, no secret — PKCE is the
   proof of possession).
4. Client opens the browser at `/api/mcp/authorize` with `code_challenge`,
   `resource` and `state`.
5. The authorize endpoint validates the request, then redirects to a consent
   screen **inside the Prospecx app**, which holds the user's session.
6. On approval the app exchanges the request for a single-use authorization code
   and redirects back with `code`, `state` and `iss`.
7. Client POSTs `/api/mcp/token` with the code and `code_verifier` → access token
   (1h) and refresh token (30d).

## Token shape

Access tokens are JWTs carrying:

```json
{
  "sub": "<user id>", "company_id": "<workspace id>",
  "scope": "read:leads read:pipeline read:insights",
  "client_id": "mcp_…", "token_use": "mcp_access",
  "aud": "https://prospecx.in/api/mcp", "iss": "https://prospecx.in"
}
```

Both `aud` and `token_use` are validated on every request. They matter together:
Prospecx signs its ordinary app sessions with the same secret, so without the
audience check any app session would authenticate against the MCP endpoint, and
without `token_use` a refresh token could be spent as an access token.

## Guarantees

- **Authorization codes are single-use**, held in Redis with a 60-second TTL and
  consumed with `GETDEL`. A replayed code fails.
- **PKCE S256 is required.** `plain` is refused.
- **`redirect_uri` is matched exactly**, never by prefix — prefix matching is the
  classic open-redirect hole.
- **Registration rejects non-HTTPS redirects** except loopback for local clients,
  and rejects any URI with a fragment.
