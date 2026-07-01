<section id="title">
  <img src="./public/banner.svg" alt="DoppelShield · URL Forensics & Homograph Scanner" width="100%">
</section>

<br />

<section id="badges" align="center">

[![License Badge](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

</section>

<br />

## Overview

DoppelShield is a URL forensics tool that exposes homograph attacks, where a deceptive link uses visually similar characters from non-Latin scripts to impersonate a legitimate domain (for example a Cyrillic `а` standing in for a Latin `a`). Paste a link and DoppelShield decodes the host, flags any Cyrillic or Greek homoglyphs with per-character evidence, traces the redirect chain safely, matches the destination against a list of commonly impersonated brands, and reports whether the domain resolves at all.

It runs as a Next.js App Router application with a user-facing scanner and a JSON API, and it is built to deploy either on a serverless platform or as a self-contained standalone/Docker service.

## Features

- Decodes the host from its IDNA `xn--` A-label back to Unicode before analysis.
- Flags Cyrillic and Greek homoglyphs and reports each with its exact Unicode codepoint and script.
- Matches the destination against a large list of commonly impersonated brands to surface look-alikes.
- Follows redirects one hop at a time, each re-validated, with loop detection and a wall-clock deadline.
- Guards every outbound request with a connect-time SSRF defense: the resolved IP is pinned, and loopback, private, and cloud-metadata ranges are blocked.
- Returns one uniform verdict for blocked or unreachable targets, so the endpoint cannot be used to map an internal network.
- Serves a strict, nonce-based Content Security Policy.
- Exposes a `POST /api/checkUrl` JSON endpoint for programmatic use.

## Tools & Technologies

- Next.js 16 (App Router) and React 19
- TypeScript
- Node.js 24
- Vitest for testing
- Docker (Next.js standalone output)

## Getting Started

Requires Node.js 24 (see `.nvmrc`).

```bash
npm ci            # install exact locked dependencies
npm run dev       # start the dev server at http://localhost:3000
```

Common scripts:

```bash
npm run build     # production build
npm start         # run the production build
npm test          # run the test suite
npm run typecheck # tsc --noEmit
npm run lint      # eslint
```

## Usage

### Web

Open the app, enter a URL, and submit. DoppelShield decodes the host, traces redirects, and shows the verdict with per-character homoglyph evidence and the redirect chain.

### API

```bash
curl -X POST http://localhost:3000/api/checkUrl \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}'
```

A response is a JSON `CheckResult`, for example:

```json
{
  "apiVersion": 1,
  "ok": true,
  "finalUrl": "https://example.com/",
  "status": 200,
  "redirectChain": [],
  "warnings": []
}
```

Failure modes return `ok: false` with a stable `error.code` (`invalid_input`, `rate_limited`, `unavailable`, or `unreachable`). Blocked and unreachable targets share the single `unreachable` code so the endpoint never reveals whether an internal host exists.

## Configuration

All runtime configuration is via environment variables. Copy the template and adjust as needed:

```bash
cp .env.example .env
```

Two variables deserve attention before a public deploy:

- `NEXT_PUBLIC_SITE_URL` is inlined and prerendered at build time (sitemap, robots, canonical and OpenGraph tags). Set it for the build, not at runtime. For Docker, pass `--build-arg NEXT_PUBLIC_SITE_URL=https://your.domain`.
- `CHECKURL_TRUSTED_IP_HEADER` selects the header used to key per-client rate limiting. Behind a proxy or CDN, set it to a header your edge sets and overwrites (`x-vercel-forwarded-for` on Vercel, `cf-connecting-ip` on Cloudflare, `x-real-ip` behind nginx). If it is left unset, all clients share one global rate-limit bucket, so a single visitor can rate-limit everyone.

Every `CHECKURL_*` tunable (timeouts, redirect and body limits, allowed ports, rate limits) is documented with its default in `.env.example`.

## Docker

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://your.domain -t doppelshield .
docker run -p 3000:3000 doppelshield
```

The image is multi-stage, runs as a non-root user, and serves the Next.js standalone server behind `tini`.

## Deployment notes

- Detection scope: homoglyph detection covers Cyrillic and Greek, the scripts most often confused with Latin, which is a curated subset of the full Unicode confusables set. A clean result means "no known homoglyphs detected," not "safe." DoppelShield is not a malware scanner or a reputation service.
- Single instance: the rate limiter and concurrency cap are per process and held in memory. Behind multiple replicas the effective limits multiply, and a client can land on different instances. Run a single instance, or move the limiter to a shared store, if you need a hard global cap.

## Testing

```bash
npm test              # run all tests once
npm run test:coverage # with coverage
```

## Data attribution

The brand-target list is derived from a public domain-popularity ranking (Majestic Million, CC BY 3.0, or an equivalent such as Tranco or Cisco Umbrella). See [NOTICE](./NOTICE) for full attribution.

## License

Licensed under the [MIT License](https://opensource.org/licenses/mit). See [LICENSE](./LICENSE).

## Contact

**Joe Maalouf**

[GitHub @joelouf](https://github.com/joelouf) · [LinkedIn /in/joelouf](https://linkedin.com/in/joelouf)
