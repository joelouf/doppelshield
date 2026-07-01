# Changelog

All notable changes to DoppelShield are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!--
Add entry under its matching heading, if absent and necessary.

In Keep a Changelog order, the full set of change types:
  ### Added       — New features
  ### Changed     — Changes to existing behavior
  ### Deprecated  — Features slated for removal
  ### Removed     — Features removed
  ### Fixed       — Bug fixes
  ### Security    — Vulnerability fixes
-->

### Security

- Bounded request-body reading to a hard byte cap enforced mid-stream. The
  Content-Length header is no longer trusted, so an absent or non-numeric value cannot let
  an oversized body buffer in full before rejection.

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

[Unreleased]: https://github.com/joelouf/doppelshield/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/joelouf/doppelshield/releases/tag/v1.0.0
