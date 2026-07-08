# Changelog

All notable changes to DoppelShield are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Terraform definition of the production environment (`infra/`): a single Fargate task
  in us-east-2 behind an ALB, an AWS WAF rate rule scoped to `POST /api/checkUrl`, a
  security-group origin lock, CloudWatch alarms on `ssrf_blocked` bursts and ALB
  health, a cost budget, and a tag-scoped GitHub OIDC role for release mirroring. No
  IAM task role is attached, so the in-container credentials endpoint has nothing to
  serve if the SSRF guard were ever bypassed.
- ADR-0008 recording the AWS topology decision: region choice, the lean subnet layout
  and its private-subnets upgrade seam, the no-task-role posture, and the
  digest-identical ECR mirror.
- A CI job that formats and validates the `infra/` Terraform (`terraform fmt` and
  `validate`), which the Prettier gate does not cover.
- A documentation suite under `docs/`: an architecture overview with component,
  lifecycle, and topology diagrams, an API reference whose examples are captured
  response transcripts, a configuration reference for every tunable, a threat model
  mapping controls to source, and a documentation index; plus a root
  `CONTRIBUTING.md`. The README, SECURITY policy, and changelog link into the suite,
  and stale README claims (the retired `tini` init, the pre-AWS deployment story, the
  Cyrillic-and-Greek-only detection scope) were corrected against the shipped code.
- A Screenshots section in the README with current captures of each verdict
  outcome (flagged, review, clear, and the uniform SSRF-safe verdict), stored
  under `docs/screenshots/` and referenced from the architecture doc and
  documentation index.
- Automated deployment on release (ADR-0010): a `deploy` job in the release
  workflow, gated by a GitHub `production` environment, assumes a dedicated
  least-privilege `doppelshield-deploy` role via OIDC (trust scoped to the
  environment, not a branch or tag), registers a new task-definition revision
  pinning the released digest, rolls the single ECS service, and fails if the
  circuit breaker rolls it back. The service now ignores `task_definition`
  changes, so Terraform owns infrastructure and the bootstrap image while the
  pipeline owns image promotion; `terraform apply` no longer changes the running
  image. Gated on the `AWS_DEPLOY_ROLE_ARN` repository variable, so the job
  skips until it is configured.

### Changed

- The Release workflow mirrors the published image into ECR by digest on version tags
  when the AWS role variable is configured, and fails if the mirrored digest differs.
  GHCR remains the source of truth; the build attestation verifies unchanged against
  the mirror.
- The deployment runbook describes the AWS edge (ALB and WAF configuration,
  `x-forwarded-for` as the trusted header, the header-spoof check rewritten for
  append semantics); Cloudflare guidance moved to the emergency platform switch
  section.
- The project license is now the Apache License, Version 2.0, replacing MIT.
  Apache-2.0 carries an explicit patent grant and defensive-termination clause that
  MIT omits, and makes the shipped `NOTICE` file the single, idiomatic source of
  copyright attribution. The package stays `private: true`; DoppelShield is a
  deployed application, not a published npm package.
- A sharp-edged shield brand mark now drives the favicon, app icons, banner, and the
  nav and footer logos, replacing the placeholder corner-bracket mark. It renders in
  the site's lime accent, locked up consistently with the two-tone `DOPPEL`/`SHIELD`
  wordmark, and obeys the hard-edged, zero-radius geometry of the rest of the
  interface.
- The README banner is now a horizontal lockup, the shield mark to the left of the
  wordmark, matching the in-app nav and footer. The mark is sized at the same
  standardized ratio the interface uses (mark box `1.3333` times the wordmark
  font-size), and the wordmark is set in the real Chakra Petch Bold outlines, so the
  proportion holds at any display width.
- The README is restructured to lead with the security posture: the flat feature
  list is split into a Detection and scope section (with an explicit scope and
  non-goals note) and a new Security summary, a brief Architecture section surfaces
  the ports-and-adapters engine, Testing is expanded into Testing and CI, and the
  stack list moves below the security narrative. Each new section stays a summary
  that links to the canonical `docs/` suite. The table of contents was rebuilt to
  match, including the previously missing Data Attribution and Joe Maalouf entries.

### Fixed

- The standalone runtime now binds to all interfaces (`HOSTNAME=0.0.0.0`) so the
  container healthcheck reaches the app under orchestrators that set `HOSTNAME` to a
  non-loopback address, such as ECS Fargate's `awsvpc` networking. Previously the
  probe on `127.0.0.1` could not reach a server bound to the task's own address.
- The Findings section no longer repeats a row when a scanned URL redirects through more
  than one host that raises the same homograph or IDN signal. The redirect walk analyzes
  every hop, so the same signal arrives once per host with differing detail; the API still
  reports each host's warning, while the report now shows one row per finding type.
- An invalid `CHECKURL_ALLOWED_PORTS` value now logs the same structured
  `config_invalid_env` warning the numeric tunables emit, naming the port list
  actually applied; previously invalid entries were dropped and the `80,443`
  fallback applied silently.

### Security

- The runtime image now builds on distroless (`gcr.io/distroless/nodejs24-debian12:nonroot`),
  so the absence of a shell, package manager, and npm is a property of the base image
  rather than a manual strip, and PID 1 init moves to Fargate's `initProcessEnabled`.
  The npm-vendored undici finding (CVE-2026-12151) is retired as `not_affected` via a
  machine-readable OpenVEX statement under `security/vex/`, with the analysis and
  re-review trigger recorded in ADR-0009.
- The shared outbound HTTP and HTTPS agents now set `maxTotalSockets` alongside
  the per-host `maxSockets`, so each agent's socket ceiling holds across all
  destinations rather than per host only, and a request aborted while queued
  behind a saturated agent now settles at the walk deadline instead of waiting
  for a socket to free.

## [1.1.0] - 2026-07-07

### Added

- A minimal `GET /api/health` liveness endpoint for orchestrator probes and uptime
  monitoring, outside the scan rate limiter and disclosing nothing but a status field.
- A Release workflow that publishes the container image to GHCR on version tags: the
  image is vulnerability-scanned before push (fixable HIGH/CRITICAL findings block the
  release), carries a BuildKit SBOM and provenance, and is bound to a Sigstore-signed
  GitHub build attestation verifiable with `gh attestation verify`.
- A CI job that builds the Docker image on every pull request, so a broken Dockerfile
  is caught before release time.
- ADR-0007 recording the production topology (single container instance behind an
  edge proxy) and a deployment runbook (`docs/runbook.md`) covering release, deploy,
  verification, rollback, and emergency platform-switch procedures.

### Changed

- The container HEALTHCHECK now probes `/api/health` instead of rendering the
  home page.

### Security

- The runtime image no longer ships npm, corepack, or yarn; the release scan flagged a vendored undici in the base image's npm (CVE-2026-12151), and the standalone server needs only the node binary.
- Bounded request-body reading to a hard byte cap enforced mid-stream. The Content-Length header is no longer trusted, so an absent or non-numeric value cannot let an oversized body buffer in full before rejection.

## [1.0.0] - 2026-06-30

Initial public release. A URL homograph and SSRF forensics scanner that decodes a host
from punycode, flags Cyrillic and Greek homoglyphs with per-glyph evidence, safely traces
the redirect chain behind a server-side SSRF guard, and reports the verdict through both a
web interface and a JSON API.

### Added

- Homograph detection for Cyrillic and Greek homoglyphs in the host, using Unicode
  script-property matching.
- Punycode (`xn--…`) host decoding back to Unicode before analysis.
- Per-glyph evidence for each suspect character: the exact Unicode codepoint, its script,
  and the Latin letter it imitates.
- Mixed-script host detection and non-ASCII URL path flagging.
- Structural warning codes for HTTPS downgrades, redirect loops, and redirect-limit reached.
- Manual hop-by-hop redirect walking that re-validates every hop, with loop detection and
  a total wall-clock deadline.
- A web scanner with live verdicts and inline glyph evidence, plus light and dark themes
  with a no-flash theme bootstrap.
- A JSON API at `POST /api/checkUrl` returning a versioned `CheckResult`, with bare hosts
  defaulted to `http://` and all other methods answered by `405` with an `Allow: POST`
  header.
- Optional `CHECKURL_*` environment configuration for timeouts, limits, the port allowlist,
  and outbound User-Agent, with safe defaults and clamped bounds.
- A Vitest suite (100+ tests) covering the handler, SSRF block lists, redirect walking,
  homograph analysis, configuration, rate limiting, and logging, including a randomized
  SSRF fuzz suite.

### Security

- Connect-time SSRF guard that resolves the host, rejects the request if any resolved
  address is private or reserved, and pins the connection to the resolved IP while
  preserving the original Host header and SNI, defeating DNS rebinding and TOCTOU.
- Block lists covering loopback, RFC 1918 private space, CGNAT, link-local and cloud
  metadata (`169.254.169.254`), unique local IPv6, and multicast and reserved ranges.
- Uniform, leak-free verdicts: blocked and unreachable targets return one response, so the
  tool cannot be used to map an internal network, and structured logs record error codes
  only, never internal addresses.
- Bounded outbound behavior: per-request socket timeout, total deadline, redirect cap,
  request body-size cap, HTTP(S)-only scheme gate, and a port allowlist.
- Per-client rate limiting (`429` with `Retry-After`) and an outbound concurrency cap
  (`503` when reached).
- Hardened response headers: a site-wide Content-Security-Policy, HSTS with preload,
  `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`,
  and cross-origin isolation, with the `/api` scope locked down to `default-src 'none'` and
  `Cache-Control: no-store`.

[Unreleased]: https://github.com/joelouf/doppelshield/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/joelouf/doppelshield/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/joelouf/doppelshield/releases/tag/v1.0.0
