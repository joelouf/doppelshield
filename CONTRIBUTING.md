# Contributing

This document covers local setup, the quality gates a change must pass, and the conventions the codebase follows. The [documentation index](docs/README.md) maps everything else.

## Setup

Node.js 24 is required (`.nvmrc` pins the version; `engines` enforces `>=24 <25`).

```bash
npm ci        # install exact locked dependencies
npm run dev   # start the dev server at http://localhost:3000
```

## Scripts

| Script                                 | What it runs                                                        |
| -------------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                          | Next.js dev server.                                                 |
| `npm run build`                        | Production build (standalone output).                               |
| `npm start`                            | Serve the production build.                                         |
| `npm run lint`                         | ESLint over the repository.                                         |
| `npm run typecheck`                    | `tsc --noEmit` under strict settings.                               |
| `npm run format`                       | Prettier, writing changes.                                          |
| `npm run format:check`                 | Prettier in check mode (what CI runs).                              |
| `npm test`                             | Vitest, single run.                                                 |
| `npm run test:watch`                   | Vitest in watch mode.                                               |
| `npm run test:coverage`                | Vitest with coverage thresholds enforced.                           |
| `npm run gen:targets -- <csv> [count]` | Regenerate the brand-target list from a popularity CSV (see below). |

## Quality gates

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs three jobs on every pull request; run the same commands locally before pushing:

```bash
npm run format:check && npm run lint && npm run typecheck && npm run test:coverage && npm run build
npm audit --audit-level=moderate
```

Changes under `infra/` must also pass Terraform checks for both stacks:

```bash
terraform fmt -check -recursive
terraform -chdir=infra init -backend=false && terraform -chdir=infra validate
terraform -chdir=infra/management init -backend=false && terraform -chdir=infra/management validate
```

CodeQL (security-extended) runs separately on pushes, pull requests, and a weekly schedule. Release tags additionally pass a Trivy image scan gate; see the [runbook](docs/runbook.md).

## Tests and coverage

Tests are `*.test.ts` files run by Vitest in a Node environment; engine suites live in `src/core/checkurl/tests/`, and tests outside the engine sit beside their source files. Coverage is scoped to the engine, `src/core/checkurl/**`, with enforced thresholds (statements 85, lines 85, functions 70, branches 68) in [vitest.config.ts](vitest.config.ts).

Two conventions to know:

- The test environment pins `CHECKURL_TRUSTED_IP_HEADER=x-vercel-forwarded-for` so rate-limit keying is deterministic in tests; configuration is read once at module load, so tests that need different values must isolate modules.
- Changes to security-sensitive paths (`ssrf.ts`, `walk.ts`, `handler.ts`, `readBody.ts`, `ratelimit.ts`) need accompanying tests. The existing suites in `src/core/checkurl/` show the expected style: behavior-level assertions, injected `lookup` and `isBlocked` fakes, no live network.

## Conventions

- **The engine stays framework-free.** `src/core/checkurl/` imports nothing from Next.js or React; it speaks Web-standard `Request` and `Response` plus Node core modules. Framework concerns belong in the thin adapters under `src/app/api/` ([ADR-0004](docs/adr/0004-framework-agnostic-checkurl-core.md)).
- **Behavior changes get a CHANGELOG entry.** Add a bullet under `[Unreleased]` in [CHANGELOG.md](CHANGELOG.md), following Keep a Changelog categories.
- **Architectural decisions get an ADR.** Copy [docs/adr/0000-template.md](docs/adr/0000-template.md) to the next number, describe context, decision, and consequences, and set the status to Accepted when it merges.
- **Never hand-edit generated files.** `src/core/checkurl/data/brandTargets.generated.ts` is produced by `npm run gen:targets -- <popularity-csv> [count]` from a public domain-popularity CSV; the CSV path argument is required ([scripts/gen-brand-targets.mjs](scripts/gen-brand-targets.mjs)); hand-curated seeds live in `src/core/checkurl/targets.ts`.
- **Configuration is env-only.** New tunables go through `src/core/checkurl/config.ts` with a default, validation, and a row in the [configuration reference](docs/configuration.md).

## Documentation style

- State what the system does, with the file that does it; prefer linking to canonical docs (runbook, ADRs, infra READMEs) over restating them.
- Keep security claims exact and bounded. A clean result means no look-alike signals were detected, never "safe"; the timing floor covers network-touching paths, not all paths. Precision like this is checked in review.
- Plain prose, sentence-case headings, no em or en dashes, no first-person plural.
- API examples must be real captured responses, not hand-written JSON.

## Security issues

Do not open a public issue for a vulnerability. Follow [SECURITY.md](SECURITY.md), which routes reports through GitHub private vulnerability reporting and documents the response windows.
