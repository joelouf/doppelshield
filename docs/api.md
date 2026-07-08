# API reference

DoppelShield exposes two HTTP endpoints: `POST /api/checkUrl`, which analyzes a URL, and `GET /api/health`, a liveness probe. There is no authentication; the endpoint is rate limited per client. Every response body in this document is a real transcript captured against a local production build (`npm run build && npm start`), so shapes, header values, and timing behavior reflect the shipped code.

The response contract is defined in [src/core/checkurl/types.ts](../src/core/checkurl/types.ts) and carries an explicit `apiVersion: 1` marker. Additive fields do not bump the version; a breaking change to an existing field would.

## POST /api/checkUrl

Analyzes one URL: decodes the host, computes homograph evidence, and follows the redirect chain server-side under SSRF protections. The request is a JSON object with a single field:

```bash
curl -X POST https://doppelshield.com/api/checkUrl \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}'
```

### Request rules

Validation happens in stages; any failure returns `400 invalid_input` ([src/core/checkurl/handler.ts](../src/core/checkurl/handler.ts), [src/core/checkurl/urlAnalysis.ts](../src/core/checkurl/urlAnalysis.ts)):

- The body must be a JSON object with a string `url` field.
- The body is read as a stream with a hard cap (8192 bytes by default) enforced mid-read, and the read itself is bounded by the connection timeout. The `Content-Length` header is not trusted.
- Input without a scheme is prefixed with `http://`, so `example.com` is accepted.
- Only `http:` and `https:` schemes are allowed, on allowlisted ports (80 and 443 by default).
- The prepared URL must be at most 2048 characters; the same cap is re-applied to every redirect target.
- Single-label hosts without a dot are rejected; IP literals and `xn--` punycode hosts are accepted.

All limits are tunable; see the [configuration reference](configuration.md).

### Response schema

Every outcome returns a `CheckResult`:

| Field           | Type                | Present                                             | Meaning                                                                                                                                                                           |
| --------------- | ------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiVersion`    | `1`                 | always                                              | Contract version marker.                                                                                                                                                          |
| `ok`            | `boolean`           | always                                              | `true` only when the walk reached a final response with a 2xx status. See the note below.                                                                                         |
| `finalUrl`      | `string`            | reachable outcomes only                             | URL of the final hop.                                                                                                                                                             |
| `status`        | `number`            | reachable outcomes only                             | HTTP status of the final hop.                                                                                                                                                     |
| `redirectChain` | `RedirectHop[]`     | analyzed outcomes (success and unreachable)         | Every hop that received a response, in order, including the final one. A hop that drew no response is not recorded, so the chain is empty if the first connection attempt failed. |
| `warnings`      | `Warning[]`         | always (may be empty)                               | Findings from name analysis and the walk, deduplicated by code and detail.                                                                                                        |
| `homograph`     | `HomographEvidence` | when the decoded host contains non-ASCII characters | Per-glyph evidence; omitted entirely for pure-ASCII hosts and on 400/405/429/503 outcomes.                                                                                        |
| `error`         | `{code, message}`   | every non-success outcome                           | Stable machine-readable code plus a human-readable message.                                                                                                                       |

Nested types:

| Type                | Fields                                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RedirectHop`       | `url: string`, `status: number`                                                                                                                                                                                |
| `Warning`           | `code: WarningCode`, `detail: string`                                                                                                                                                                          |
| `HomographEvidence` | `decodedHost: string`, `asciiHost?: string`, `skeleton: string` (UTS #39 style confusables skeleton; characters without a mapping pass through unchanged), `glyphs: GlyphEvidence[]`, `target: string \| null` |
| `GlyphEvidence`     | `char: string`, `codepoint: string` (`U+XXXX`), `script: string`, `imitates: string \| null` (the Latin text the glyph is confusable with)                                                                     |

A note on `ok`: it is `false` both when the destination answered with a non-2xx status (then `finalUrl` and `status` are present and `error` is absent) and when the request failed outright (then `error` is present and `finalUrl` is absent). Branch on the presence of `error` and `finalUrl`, not on `ok` alone.

### Outcomes

| HTTP | `error.code`         | Trigger                                                 | Extra headers                                   | Timing floor |
| ---- | -------------------- | ------------------------------------------------------- | ----------------------------------------------- | ------------ |
| 200  | absent               | Walk completed; `ok` reflects the final status          |                                                 | yes          |
| 200  | `unreachable`        | DNS failure, timeout, refused connection, or SSRF block |                                                 | yes          |
| 400  | `invalid_input`      | Body or URL failed validation                           |                                                 | no           |
| 405  | `method_not_allowed` | Any method other than POST                              | `allow: POST`                                   | no           |
| 429  | `rate_limited`       | Client key exceeded the rate limit                      | `retry-after` (seconds until the window resets) | no           |
| 503  | `unavailable`        | Concurrency cap reached                                 | `retry-after: 5`                                | yes          |

Two deliberate properties, recorded in [ADR-0001](adr/0001-uniform-ssrf-error-oracle.md):

- Every network failure collapses to the single `unreachable` outcome: one code, one message, HTTP 200, no `finalUrl`. A blocked internal target, a nonexistent domain, and a timed-out host are indistinguishable to the caller, so the endpoint cannot be used to map private networks.
- Outcomes that touch the network (or admit that the scanner is busy) are padded to a minimum response time, 500 ms in production. The pad is a floor, not a normalizer: every failure faster than the floor (a denylist hit, a nonexistent domain, a refused connection) presents identical latency, while a probe that runs to its connection timeout remains visibly slower. Blocked targets fail before any connection is attempted, so their timing never reflects the target's behavior. The 400, 405, and 429 paths never touch the network and return immediately.

### Warning codes

Name-analysis warnings ([src/core/checkurl/homograph.ts](../src/core/checkurl/homograph.ts)) are computed for the submitted host before any connection and are reported even when the host is unreachable; the walk repeats the analysis on every redirect hop's hostname and merges the results into the same array. For a single analyzed host, the three `homograph_*` codes are mutually exclusive in this priority order; a redirect chain that crosses hosts can therefore carry more than one:

| Code                                | Emitted when                                                                                                                                                                                                 | UI severity   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| `homograph_target_impersonation`    | A label's skeleton differs from the label itself and matches the second-level token of a known brand domain (40 seed targets plus a generated top-domains list); the genuine brand domain never triggers it. | flagged       |
| `homograph_whole_script_confusable` | A label written entirely in one non-Latin script reads as plausible Latin text; only the registrable label is exempt when its script is native to the TLD.                                                   | flagged       |
| `homograph_mixed_script`            | A label mixes scripts (standard Japanese and Korean combinations are exempt).                                                                                                                                | caution       |
| `punycode_host`                     | The host is an IDN; the detail includes the decoded form. Informational: an IDN is not by itself suspicious.                                                                                                 | informational |
| `non_ascii_path`                    | The URL path contains characters outside the printable ASCII range after percent-decoding; percent-encoded control characters also trigger it.                                                               | caution       |
| `https_downgrade`                   | A redirect hop moved from `https:` to `http:` ([src/core/checkurl/walk.ts](../src/core/checkurl/walk.ts)).                                                                                                   | caution       |
| `redirect_cycle`                    | The walk revisited a URL it had already fetched.                                                                                                                                                             | caution       |
| `max_redirects_reached`             | The walk stopped at the redirect cap (3 by default).                                                                                                                                                         | caution       |

The API returns warnings, not a verdict. The FLAGGED, REVIEW, CLEAR, and INDETERMINATE labels shown in the web UI are derived client-side in [src/lib/result/verdict.ts](../src/lib/result/verdict.ts): any flagged-severity warning yields FLAGGED, any other actionable warning yields REVIEW, errors yield INDETERMINATE, and CLEAR means no look-alike signals were detected in the name, not that the destination is safe. API consumers applying their own policy should treat the warning codes, not the UI labels, as the contract.

### Example: clean result

```bash
curl -s -X POST http://localhost:3000/api/checkUrl \
  -H 'content-type: application/json' -d '{"url":"https://example.com"}'
```

```json
{
  "apiVersion": 1,
  "ok": true,
  "finalUrl": "https://example.com/",
  "status": 200,
  "redirectChain": [{ "url": "https://example.com/", "status": 200 }],
  "warnings": []
}
```

The chain always includes the final response, so a direct hit has one entry.

### Example: redirect chain

```bash
curl -s -X POST http://localhost:3000/api/checkUrl \
  -H 'content-type: application/json' -d '{"url":"http://github.com"}'
```

```json
{
  "apiVersion": 1,
  "ok": true,
  "finalUrl": "https://github.com/",
  "status": 200,
  "redirectChain": [
    { "url": "http://github.com/", "status": 301 },
    { "url": "https://github.com/", "status": 200 }
  ],
  "warnings": []
}
```

### Example: brand impersonation, host unreachable

`xn--pypl-53dc.com` is `pаypаl.com` with Cyrillic `а` (U+0430) in both `a` positions. The domain did not resolve when captured; name analysis still runs in full:

```bash
curl -s -X POST http://localhost:3000/api/checkUrl \
  -H 'content-type: application/json' -d '{"url":"https://xn--pypl-53dc.com"}'
```

```json
{
  "apiVersion": 1,
  "ok": false,
  "redirectChain": [],
  "warnings": [
    {
      "code": "punycode_host",
      "detail": "Internationalized domain name (IDN); A-label decodes to pаypаl.com"
    },
    {
      "code": "homograph_target_impersonation",
      "detail": "Host is confusable with paypal.com: pаypаl.com"
    }
  ],
  "homograph": {
    "decodedHost": "pаypаl.com",
    "asciiHost": "xn--pypl-53dc.com",
    "skeleton": "paypal.com",
    "glyphs": [
      {
        "char": "а",
        "codepoint": "U+0430",
        "script": "Cyrillic",
        "imitates": "a"
      }
    ],
    "target": "paypal.com"
  },
  "error": {
    "code": "unreachable",
    "message": "No response was received for this URL."
  }
}
```

Each distinct non-ASCII codepoint appears once in `glyphs` regardless of how often it occurs in the host. Whether this particular domain resolves may change over time; the response shape is the point.

### Example: benign IDN

A legitimate internationalized domain draws only the informational `punycode_host` warning. This capture also happens to include a real `https_downgrade` observed in the site's own redirect chain:

```bash
curl -s -X POST http://localhost:3000/api/checkUrl \
  -H 'content-type: application/json' -d '{"url":"https://münchen.de"}'
```

```json
{
  "apiVersion": 1,
  "ok": true,
  "finalUrl": "https://www.muenchen.de/",
  "status": 200,
  "redirectChain": [
    { "url": "https://xn--mnchen-3ya.de/", "status": 301 },
    { "url": "http://www.muenchen.de/", "status": 301 },
    { "url": "https://www.muenchen.de/", "status": 200 }
  ],
  "warnings": [
    {
      "code": "punycode_host",
      "detail": "Internationalized domain name (IDN); A-label decodes to münchen.de"
    },
    {
      "code": "https_downgrade",
      "detail": "Redirect downgrades HTTPS to HTTP"
    }
  ],
  "homograph": {
    "decodedHost": "münchen.de",
    "asciiHost": "xn--mnchen-3ya.de",
    "skeleton": "münchen.de",
    "glyphs": [
      {
        "char": "ü",
        "codepoint": "U+00FC",
        "script": "Latin",
        "imitates": null
      }
    ],
    "target": null
  }
}
```

`ü` is a Latin-script character with no confusable mapping, so `imitates` is `null` and the skeleton is unchanged; the evidence documents the host without accusing it.

### Example: blocked internal target

A request aimed at the cloud metadata service is refused before any connection is made, and the response is identical to any other unreachable host:

```bash
curl -s -X POST http://localhost:3000/api/checkUrl \
  -H 'content-type: application/json' -d '{"url":"http://169.254.169.254/latest/meta-data/"}'
```

```json
{
  "apiVersion": 1,
  "ok": false,
  "redirectChain": [],
  "warnings": [],
  "error": {
    "code": "unreachable",
    "message": "No response was received for this URL."
  }
}
```

### Example: invalid input

```bash
curl -si -X POST http://localhost:3000/api/checkUrl \
  -H 'content-type: application/json' -d '{"url":"not a url"}'
```

```
HTTP/1.1 400 Bad Request
```

```json
{
  "apiVersion": 1,
  "ok": false,
  "warnings": [],
  "error": { "code": "invalid_input", "message": "The URL is invalid." }
}
```

### Example: rate limited

The 21st request inside one window (20 per 60 seconds by default):

```
HTTP/1.1 429 Too Many Requests
retry-after: 50
```

```json
{
  "apiVersion": 1,
  "ok": false,
  "warnings": [],
  "error": {
    "code": "rate_limited",
    "message": "Too many requests. Please try again later."
  }
}
```

`retry-after` is dynamic: the seconds remaining until the client's window resets.

### Example: scanner busy

Captured with `CHECKURL_MAX_CONCURRENT_SCANS=1` and a second request racing a slow scan:

```
HTTP/1.1 503 Service Unavailable
retry-after: 5
```

```json
{
  "apiVersion": 1,
  "ok": false,
  "warnings": [],
  "error": {
    "code": "unavailable",
    "message": "The scanner is busy. Please try again in a moment."
  }
}
```

The body deliberately carries no analysis: input validation and name analysis still run locally, but their results are not included, no connection is attempted, and a retry after the `retry-after` interval returns the full result.

### Example: wrong method

```bash
curl -si http://localhost:3000/api/checkUrl
```

```
HTTP/1.1 405 Method Not Allowed
allow: POST
```

```json
{
  "apiVersion": 1,
  "ok": false,
  "warnings": [],
  "error": {
    "code": "method_not_allowed",
    "message": "Use POST to submit a URL."
  }
}
```

## Response headers

Every `/api/*` response carries a strict header set from [next.config.ts](../next.config.ts), on top of the site-wide security headers:

```
Cache-Control: no-store
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
X-Frame-Options: DENY
Referrer-Policy: no-referrer
```

## Rate limiting

Two independent layers apply in production:

- In-process: a fixed-window limiter ([src/core/checkurl/ratelimit.ts](../src/core/checkurl/ratelimit.ts)), 20 requests per 60 seconds per client key by default, bounded at 10000 tracked keys with soonest-reset eviction. The client key derives from the rightmost hop of the trusted IP header; see the [configuration reference](configuration.md) for keying details and the degraded single-bucket mode when the header is unset.
- At the edge: an AWS WAF rate rule scoped to `POST /api/checkUrl`, 100 requests per 60 seconds per source IP ([infra/waf.tf](../infra/waf.tf)). The edge cap is deliberately about five times the in-process limit, so the application limiter stays the precise enforcer and the WAF absorbs floods.

## GET /api/health

Liveness probe used by the load balancer and the container health check. Returns exactly this, and nothing else, with HTTP 200:

```json
{ "status": "ok" }
```

It is not subject to the scan rate limiter and discloses no version or configuration detail ([src/app/api/health/route.ts](../src/app/api/health/route.ts)).

## Related documents

- [Configuration reference](configuration.md) for every tunable behind these behaviors.
- [Architecture](architecture.md) for the request lifecycle these outcomes fall out of.
- [Threat model](threat-model.md) for the security rationale behind the uniform error and timing floor.
