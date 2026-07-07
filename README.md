<section id="title">
  <img src="./public/banner.svg" alt="DoppelShield / URL Forensics & Homograph Scanner" width="100%">
</section>

<br />

<section id="badges" align="center">

<!-- [![CI](https://github.com/joelouf/doppelshield/.github/workflows/ci.yml/badge.svg)](https://github.com/joelouf/doppelshield/.github/workflows/ci.yml) -->
<!-- [![CodeQL](https://github.com/joelouf/doppelshield/.github/workflows/codeql.yml/badge.svg)](https://github.com/joelouf/doppelshield/.github/workflows/codeql.yml) -->

[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

</section>

<br />

<section id="description">
  <p>DoppelShield is a URL forensics tool that exposes homograph attacks, where a deceptive link uses visually similar characters from non-Latin scripts to impersonate a legitimate domain (for example a Cyrillic `а` standing in for a Latin `a`). Paste a link and DoppelShield decodes the host, flags any Cyrillic or Greek homoglyphs with per-character evidence, traces the redirect chain safely, matches the destination against a list of commonly impersonated brands, and reports whether the domain resolves at all.</p>

  <p>It runs as a Next.js App Router application with a user-facing scanner and a JSON API, and it is built to deploy either on a serverless platform or as a self-contained standalone/Docker service.</p>
</section>

<br />

<details open>
  <summary style="overflow: hidden; cursor: pointer;">
    <h2 style="display: inline;">&ensp;Table of Contents</h2>
  </summary>

  <nav style="margin-top: 0.6rem">
    <ul>
      <!-- <li><a href="#screenshots">Screenshots</a></li> -->
      <li><a href="#features">Features</a></li>
      <!-- <li><a href="#architecture">Architecture</a></li> -->
      <!-- <li><a href="#security">Security</a></li> -->
      <!-- <li><a href="#configuration">Configuration</a></li> -->
      <li><a href="#tools--technologies">Tools & Technologies</a></li>
      <li><a href="#getting-started">Getting Started</a></li>
      <!-- <li><a href="#development">Development</a></li> -->
      <li><a href="#usage">Usage</a></li>
        <ul>
          <li><a href="#web">Web</a></li>
          <li><a href="#api">API</a></li>
        </ul>
      <li><a href="#project-structure">Project Structure</a></li>
      <li><a href="#testing">Testing</a></li>
      <li><a href="#roadmap">Roadmap</a></li>
      <li><a href="#license">License</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  </nav>
</details>

<br />

<h2 id="features">Features</h2>

<ul>
  <li>Decodes the host from its IDNA `xn--` A-label back to Unicode before analysis.</li>
  <li>Flags Cyrillic and Greek homoglyphs and reports each with its exact Unicode codepoint and script.</li>
  <li>Matches the destination against a large list of commonly impersonated brands to surface look-alikes.</li>
  <li>Follows redirects one hop at a time, each re-validated, with loop detection and a wall-clock deadline.</li>
  <li>Guards every outbound request with a connect-time SSRF defense: the resolved IP is pinned, and loopback, private, and cloud-metadata ranges are blocked.</li>
  <li>Returns one uniform verdict for blocked or unreachable targets, so the endpoint cannot be used to map an internal network.</li>
  <li>Serves a strict, nonce-based Content Security Policy.</li>
  <li>Exposes a `POST /api/checkUrl` JSON endpoint for programmatic use.</li>
</ul>

<h2 id="tools--technologies">Tools & Technologies</h2>

<ul>
  <li>Next.js 16 (App Router) and React 19</li>
  <li>TypeScript</li>
  <li>Node.js 24</li>
  <li>Vitest for testing</li>
  <li>Docker (Next.js standalone output)</li>
</ul>

<h2 id="getting-started">Getting Started</h2>

Requires Node.js 24 (see `.nvmrc`).

```bash
npm ci        # Install exact locked dependencies
npm run dev   # Start the dev server at http://localhost:3000
```

Common scripts:

```bash
npm run build       # Production build
npm start           # Run the production build
npm test            # Run the test suite
npm run typecheck   # tsc --noEmit
npm run lint        # Eslint
```

<h2 id="usage">Usage</h2>

<h3 id="web">Web</h3>

Open the app, enter a URL, and submit. DoppelShield decodes the host, traces redirects, and shows the verdict with per-character homoglyph evidence and the redirect chain.

<h3 id="api">API</h3>

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

<h2 id="configuration">Configuration</h2>

All runtime configuration is via environment variables. Copy the template and adjust as needed:

```bash
cp .env.example .env
```

Two variables deserve attention before a public deploy:

- `NEXT_PUBLIC_SITE_URL` is inlined and prerendered at build time (sitemap, robots, canonical and OpenGraph tags). Set it for the build, not at runtime. For Docker, pass `--build-arg NEXT_PUBLIC_SITE_URL=https://your.domain`.
- `CHECKURL_TRUSTED_IP_HEADER` selects the header used to key per-client rate limiting. Behind a proxy or CDN, set it to a header your edge sets and overwrites (`x-vercel-forwarded-for` on Vercel, `cf-connecting-ip` on Cloudflare, `x-real-ip` behind nginx). If it is left unset, all clients share one global rate-limit bucket, so a single visitor can rate-limit everyone.

Every `CHECKURL_*` tunable (timeouts, redirect and body limits, allowed ports, rate limits) is documented with its default in `.env.example`.

<h2 id="docker">Docker</h2>

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://your.domain -t doppelshield .
docker run -p 3000:3000 doppelshield
```

The image is multi-stage, runs as a non-root user, and serves the Next.js standalone server behind `tini`.

<h2 id="deployment">Deployment</h2>

Production runs as a single container instance behind an edge proxy; the reasoning is recorded in [ADR-0007](./docs/adr/0007-single-instance-container-topology.md) and the operational procedures (release, deploy, verification, rollback, emergency platform switch) live in the [deployment runbook](./docs/runbook.md).

- Release artifact: version tags publish the image to GHCR, scanned before push, with an SBOM, provenance, and a Sigstore-signed build attestation attached. Deploy by digest on any OCI-compatible host.
- Health: orchestrator probes and the container HEALTHCHECK target `GET /api/health`, which sits outside the scan rate limiter and discloses nothing but a status field.
- Detection scope: homoglyph detection covers Cyrillic and Greek, the scripts most often confused with Latin, which is a curated subset of the full Unicode confusables set. A clean result means "no known homoglyphs detected," not "safe." DoppelShield is not a malware scanner or a reputation service.
- Single instance: the rate limiter and concurrency cap are per process and held in memory. Behind multiple replicas the effective limits multiply, and a client can land on different instances. The edge applies the global rate limit; the in-process limiter is defense-in-depth. If horizontal scale is ever needed, a shared-store limiter slots in behind the existing `RateLimiter` interface.

<h2 id="testing">Testing</h2>

```bash
npm test                # Run all tests once
npm run test:coverage   # Run with coverage
```

<h2 id="roadmap">Roadmap</h2>

<ul>
  <li><b>Browser extension</b>: Check the links you browse for homograph domains in place, without pasting manually.</li>
</ul>

<h2 id="license">License</h2>

<p>This project is licensed under the <a href="https://opensource.org/licenses/mit">MIT License</a>. For more details regarding rights and limitations, see <a href="./LICENSE">LICENSE</a>.</p>

<h3 id="data-attribution">Data Attribution</h3>

The brand-target list is derived from the <a href="https://majestic.com/reports/majestic-million">Majestic Million</a>, licensed <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>, or an equivalent public domain-popularity ranking, such as Tranco or Cisco Umbrella. See [NOTICE](./NOTICE) for full attribution.

<h2 id="contact">Contact</h2>

<h3>Joe Maalouf</h3>
<address style="display: flex; justify-content: flex-start; list-style-type: none;">
  <a href="https://github.com/joelouf" title="GitHub: @joelouf" target="_blank"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" height="32" alt="github.com/joelouf" /></a>&ensp;<a href="https://linkedin.com/in/joelouf" title="LinkedIn: /in/joelouf" target="_blank"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge" height="32" alt="linkedin.com/in/joelouf" /></a>
</address>

<br />
<hr />

<p align="right"><a href="#title">Back to top ↑</a></p>
