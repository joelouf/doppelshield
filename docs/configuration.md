# Configuration reference

Every runtime tunable is an environment variable. This document is the canonical reference for what each variable does, its default, and the bounds the engine enforces. The template values live in [.env.example](../.env.example); the parsing and clamping logic lives in [src/core/checkurl/config.ts](../src/core/checkurl/config.ts).

## How configuration is read

The engine reads `process.env` once, at module load, into a read-only, const-asserted `CONFIG` object (`src/core/checkurl/config.ts`). Consequences:

- Changing a variable requires a process restart. There is no live reload.
- Invalid values never crash the process. A value that fails validation logs a structured `config_invalid_env` warning and falls back to the default; `CHECKURL_ALLOWED_PORTS` logs the same warning when it drops invalid entries, and applies `80,443` when no valid port remains.
- Values above a documented maximum are clamped down to it, and positive values below a documented minimum are clamped up (`CHECKURL_RATE_LIMIT_WINDOW_MS=500` becomes 1000). Zero and negative values are not clamped; they fail validation and fall back to the default, so `CHECKURL_RATE_LIMIT_MAX=0` yields 20, not 1.
- `CHECKURL_TOTAL_DEADLINE_MS` is coerced to be at least `CHECKURL_TIMEOUT_MS` (`coherentDeadline`), so the whole-walk deadline can never be shorter than a single connection attempt.

## Build-time versus runtime

`NEXT_PUBLIC_SITE_URL` is inlined at build time into prerendered metadata (sitemap, robots, canonical and OpenGraph tags). Set it when building, not when running:

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://your.domain -t doppelshield .
```

The [Dockerfile](../Dockerfile) declares it as a build `ARG` with the production default. Every other variable in this document is read at container start.

## Variable reference

| Variable                        | Default                                               | Accepted values                     | Purpose                                                                                                                                                        |
| ------------------------------- | ----------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | `https://doppelshield.com`                            | absolute origin                     | Public origin baked into build-time metadata. Build-time only.                                                                                                 |
| `NODE_ENV`                      | `production` (in the image)                           | `production`, `development`, `test` | Runtime mode. Also selects the `CHECKURL_MIN_RESPONSE_MS` default: 500 in production, 0 otherwise.                                                             |
| `PORT`                          | `3000`                                                | port number                         | Port the server listens on.                                                                                                                                    |
| `CHECKURL_TIMEOUT_MS`           | `5000`                                                | integer, clamped 1 to 120000        | Socket timeout for each outbound connection attempt. Also bounds the request-body read.                                                                        |
| `CHECKURL_TOTAL_DEADLINE_MS`    | `10000`                                               | integer, clamped 1 to 300000        | Wall-clock deadline for an entire redirect walk. Coerced to at least `CHECKURL_TIMEOUT_MS`.                                                                    |
| `CHECKURL_MAX_REDIRECTS`        | `3`                                                   | integer, 0 or greater               | Redirect hops followed before the walk stops with `max_redirects_reached`.                                                                                     |
| `CHECKURL_MAX_URL_LENGTH`       | `2048`                                                | positive integer                    | Maximum accepted URL length, enforced on input and on every redirect target.                                                                                   |
| `CHECKURL_ALLOWED_PORTS`        | `80,443`                                              | CSV of ports 1 to 65535             | Outbound port allowlist, re-asserted on every redirect hop.                                                                                                    |
| `CHECKURL_USER_AGENT`           | `DoppelShieldBot/1.0 (+https://doppelshield.com/bot)` | string                              | User-Agent sent on outbound probes.                                                                                                                            |
| `CHECKURL_TRUSTED_IP_HEADER`    | empty                                                 | header name                         | Header used to derive the rate-limit client key. See the section below before deploying.                                                                       |
| `CHECKURL_MAX_SOCKETS`          | `64`                                                  | integer, clamped 1 to 10000         | Socket cap for each of the two shared outbound agents (HTTP and HTTPS), per destination host and per agent in total; the combined ceiling is twice this value. |
| `CHECKURL_MAX_CONCURRENT_SCANS` | `50`                                                  | integer, clamped 1 to 10000         | In-flight scan admission cap. Excess requests receive 503 `unavailable`.                                                                                       |
| `CHECKURL_MAX_BODY_BYTES`       | `8192`                                                | integer, clamped 1 to 10485760      | Request-body cap, enforced while streaming. Oversized bodies are rejected mid-read as 400.                                                                     |
| `CHECKURL_MIN_RESPONSE_MS`      | `500` in production, `0` otherwise                    | integer, 0 or greater               | Minimum response time for network-touching outcomes. Timing-oracle defense, see the threat model.                                                              |
| `CHECKURL_RATE_LIMIT_MAX`       | `20`                                                  | integer, clamped 1 to 10000         | Requests allowed per client key per window.                                                                                                                    |
| `CHECKURL_RATE_LIMIT_WINDOW_MS` | `60000`                                               | integer, clamped 1000 to 3600000    | Rate-limit window length.                                                                                                                                      |

Two scope notes:

- The rate limiter and the concurrency cap are in-memory and per process. Behind multiple replicas the effective limits multiply. See [ADR-0007](adr/0007-single-instance-container-topology.md) for why a single instance keeps this correct, and the `RateLimiter` interface in [src/core/checkurl/ratelimit.ts](../src/core/checkurl/ratelimit.ts) for the injection seam a shared-store limiter would use.
- The Next.js route adapter also declares `maxDuration = 15` ([src/app/api/checkUrl/route.ts](../src/app/api/checkUrl/route.ts)), a platform-level ceiling above the engine's own 10 second walk deadline.

## CHECKURL_TRUSTED_IP_HEADER

This is the one variable that must be set deliberately for any deployment behind a proxy or CDN. It names the header the rate limiter trusts to identify a client.

`resolveClientKey` ([src/core/checkurl/handler.ts](../src/core/checkurl/handler.ts)) reads the named header and takes the rightmost non-empty entry. A trusted reverse proxy appends the address it observed to the end of the list, so the rightmost hop is the value the edge attested; entries a client prepends itself are ignored. Point the variable at a header your edge sets or appends on every request:

| Edge                 | Value                    | Why                                                                         |
| -------------------- | ------------------------ | --------------------------------------------------------------------------- |
| AWS ALB (production) | `x-forwarded-for`        | The ALB appends the connecting IP, so the rightmost entry is ALB-attested.  |
| Cloudflare           | `cf-connecting-ip`       | Set by Cloudflare, overwritten if a client supplies it.                     |
| Vercel               | `x-vercel-forwarded-for` | Set by the Vercel edge.                                                     |
| nginx                | `x-real-ip`              | Set it in the proxy config with `proxy_set_header X-Real-IP $remote_addr;`. |

Do not point it at a header the edge passes through unmodified; that hands every client control over its own rate-limit bucket.

When the variable is empty, every request shares one global bucket under the key `anon`, and a single client can exhaust the limit for everyone. The handler logs this degraded state once at startup:

```json
{
  "level": "warn",
  "ts": "2026-07-08T03:19:04.794Z",
  "event": "checkurl_rate_limit_degraded",
  "reason": "no_trusted_ip_header",
  "effect": "requests_share_one_global_bucket"
}
```

The production deployment sets `x-forwarded-for`; the header-spoofing check in the [runbook](runbook.md) verifies the end-to-end behavior after each deploy.

## Values set in production

The ECS task definition ([infra/ecs.tf](../infra/ecs.tf)) injects exactly three variables:

| Variable                     | Value             | Reason                                                          |
| ---------------------------- | ----------------- | --------------------------------------------------------------- |
| `HOSTNAME`                   | `0.0.0.0`         | The standalone server must bind all interfaces inside the task. |
| `CHECKURL_TRUSTED_IP_HEADER` | `x-forwarded-for` | The ALB is the trusted edge; see the section above.             |
| `PORT`                       | `3000`            | Matches the container port the target group forwards to.        |

Every other tunable runs on the code defaults in this document. Changing one in production means editing the task definition environment in `infra/ecs.tf` and applying; the [runbook](runbook.md) covers the deploy procedure.

## Related documents

- [API reference](api.md) for how these limits surface to callers (status codes, `retry-after`, error codes).
- [Threat model](threat-model.md) for the rationale behind the rate-limit keying and the minimum-response floor.
- [Runbook](runbook.md) for deploy-time and post-deploy verification steps.
