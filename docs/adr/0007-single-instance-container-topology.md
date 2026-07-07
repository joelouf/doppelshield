# 7. Single-instance container topology with an edge in front

Status: Accepted

Date: 2026-07-07

## Context

The repository has, until now, carried signals for three deployment targets at
once: Vercel (`maxDuration` in the route segment config, `x-vercel-forwarded-for`
in the configuration examples), Netlify (the published demo), and a hardened
standalone Docker image. An internal pre-production review identified this
ambiguity as the root of its two highest-priority findings: the rate
limiter and the scan-concurrency cap are per-process and in-memory
(ADR-0004 deliberately keeps the core self-contained), so their effectiveness
is a property of the topology, not of the code. On a serverless platform every
function instance holds its own bucket and the per-client limit silently
approaches "no limit"; behind N replicas the limits multiply by N. The
client-IP keying has the same shape: `CHECKURL_TRUSTED_IP_HEADER` is only
meaningful when exactly one known edge sets that header and overwrites any
client-supplied value.

The project also has an explicit portability requirement: it must survive an
emergency platform switch (including a possible future move to AWS) without
reworking implementation details.

The options considered were: (a) serverless deployment with the limiter moved
to a shared store (Redis), (b) multi-replica containers with the same shared
store, and (c) a single container instance behind a CDN/edge layer, keeping
the engine dependency-free.

## Decision

Production runs as one instance of the standalone container image behind an
edge proxy (currently Cloudflare), and the OCI image published by the release
workflow is the only deployable artifact.

- The image on GHCR, addressed by digest, is what every environment runs. Any
  OCI-compatible host (Fly.io, Render, a VPS, AWS App Runner or ECS) is an
  acceptable substrate; switching hosts is a configuration act, not a code
  change. CI builds the image on every pull request; the release workflow
  scans it, attaches an SBOM and provenance, and publishes on version tags.
- The edge terminates TLS, applies a global rate-limit rule on
  `/api/checkUrl`, and sets the client-IP header. `CHECKURL_TRUSTED_IP_HEADER`
  is set to that edge's header (`cf-connecting-ip` for Cloudflare;
  `x-forwarded-for` behind an AWS ALB, whose append semantics match the
  rightmost-hop parsing in `resolveClientKey`). The origin accepts traffic
  only from the edge's address ranges so the header contract cannot be
  bypassed by direct connection.
- The in-memory rate limiter and concurrency cap remain the in-process
  defense-in-depth layer and are correct at one instance. The engine takes no
  new dependency: no Redis, no external state. If horizontal scale is ever
  required, a shared-store `RateLimiter` is added behind the existing
  injection seam (`CheckUrlDeps` in handler.ts) and this record is superseded.
- `maxDuration` stays in the route segment config as a deliberately retained
  escape hatch: it is inert in a container and caps the request if the app is
  ever emergency-deployed to a serverless platform, where the in-memory
  limiter is already understood to degrade.

## Consequences

Both review findings close by construction: the limits are real because
exactly one process enforces them, and the IP-keying header has exactly one
writer. The zero-external-state property is what makes the emergency-switch
requirement cheap — a migration is "pull the same digest, set the same
environment variables, move DNS" — and it keeps local development identical to
production.

The single instance is an accepted availability trade-off: a crash means
downtime until the container restarts (tini plus the platform supervisor and
the `/api/health` probe bound that window). This is proportionate for a
portfolio scanner; it would not be for a paid service, and the escape path
(shared-store limiter, then replicas) is already shaped by the injection seam.

The edge configuration is the least portable layer. Cloudflare rules do not
export to AWS WAF or any other product, so a platform switch re-authors the
edge rate limit and origin lockdown by hand — accepted, since the in-process
limiter covers the gap during a transition and the rules are few. The
operational procedure, including verification that the edge overwrites the
trusted header, lives in docs/runbook.md.
