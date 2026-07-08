# 9. Distroless runtime retires the npm-vendored undici finding

Status: Accepted

Date: 2026-07-07

## Context

Docker Scout, surfaced in the editor by the Docker DX extension, reports one
HIGH finding on every `FROM node:24-alpine` line in the Dockerfile:
CVE-2026-12151, an uncontrolled resource consumption flaw in undici (CVSS 7.5,
fixed in undici 6.27.0). The reported copy is the undici vendored inside the npm
that the Node base image bundles, on disk under
`/usr/local/lib/node_modules/npm`.

Several facts shaped the response:

- The vulnerability is a WebSocket-client denial of service. undici caps the
  cumulative byte size of a WebSocket message but never caps the number of
  continuation frames, so a hostile or compromised WebSocket server can stream
  an unbounded run of frames until the client exhausts memory. It is not
  reachable through ordinary HTTP fetch responses.
- The application never opens a WebSocket. Every outbound request in
  `src/core/checkurl` is an HTTP fetch, so the vulnerable path is unreachable
  regardless of which undici version is present.
- Bumping the base image does not help today. The pinned digest is already the
  newest `node:24-alpine` (Node 24.18, npm 11.16, undici 6.26.0). npm 11.18.0
  (published 2026-06-29) is the first npm to vendor the patched undici 6.27.0,
  and no Node 24.x release has bundled it yet. A rebuilt `node:24-alpine` on the
  usual cadence (Node 24.19 or later, expected late July 2026) will carry it and
  scan clean with no Dockerfile change.
- The finding is bound to the base image reference, not the built artifact. The
  Docker DX diagnostic comes from a hosted Scout scan keyed on the `FROM` image,
  so it does not read a repository VEX file, a `.trivyignore`, or an attestation
  attached to the built image. Only two things clear it: a base reference Scout
  considers clean, or the extension's own setting.
- The runner stage already removed npm by hand (commit 146cf46) to keep the
  shipped image clear of the vendored undici. That strip is imperative and
  fragile: it depends on a fixed set of paths and silently rots if the base
  layout moves.

The deps and build stages genuinely need npm (`npm ci`, `npm run build`), so
they cannot leave a base that carries npm until upstream ships a patched one.
The runner stage needs only the `node` binary.

## Decision

The runtime stage runs on `gcr.io/distroless/nodejs24-debian12:nonroot`, pinned
by its multi-architecture index digest. Distroless carries the Node 24 runtime
and nothing else: no shell, no package manager, and therefore none of the
npm-vendored undici the finding scans. The removal is a property of the base
rather than a hand-written `rm`, so it cannot silently regress.

- The `apk add tini`, npm strip, and user-creation `RUN` steps are gone. None
  can run without a shell, and none is needed: the package managers are absent
  and the nonroot uid 65532 is built in. Files copy in with numeric
  `--chown=65532:65532`, applied by BuildKit at copy time.
- PID 1 signal handling moves to the orchestrator. The task definition sets
  `linuxParameters.initProcessEnabled`, so Fargate injects its managed init as
  PID 1 to forward SIGTERM for graceful drains and reap children. This replaces
  the in-image tini rather than reproducing it inside a shell-less image.
- The container health probe uses the absolute interpreter `/nodejs/bin/node` in
  exec form, since node is not on PATH and no shell exists to resolve it.
  Production continues to gate on the ALB `GET /api/health` check (ADR-0008);
  the in-image and task-definition probes are the local and ECS equivalents.
- The deps and build stages stay on the digest-pinned `node:24-alpine`. Their
  undici is build-time only and never published.

The residual base finding on the two build stages is recorded as an OpenVEX
statement at `security/vex/cve-2026-12151-undici.openvex.json` with status
`not_affected` and justification `component_not_present`, and the Docker DX
diagnostic is quieted in `.vscode/settings.json` with a comment pointing here.
Both are temporary and retire together once the base ships a patched npm.

## Consequences

The shipped image is clean of this finding by construction, not by maintenance,
and its attack surface shrinks further: there is no shell and no package manager
to abuse if an attacker reaches the container. The release gate is unaffected;
Trivy scans the built image with `ignore-unfixed` and never saw the vendored
undici once npm was removed.

The runtime moves from Alpine (musl) to Debian (glibc). The images are close in
size, so the trade is surface and provenance, not bytes. Debugging inside the
container is harder because there is no shell; investigation happens through
logs, the ALB probe, and `docker run` against a locally built image.

The change keeps Node pinned at 24 and keeps every base pinned by digest, so
builds stay reproducible. It does not adopt a rolling "zero CVE" base such as
Chainguard, which was evaluated and set aside: its free tier publishes only
rolling `latest` tags and would force a silent Node major jump, against the
reproducibility this project holds.

Two items carry a re-review trigger, both watched by Dependabot's Docker
updates. Re-pin `node:24-alpine` once it bundles npm 11.18.0 or later, then
remove the VEX statement and the editor setting. Separately, track a Node
release that rebases the runtime's internal undici to 7.28.0 or later, which
closes the same advisory in the copy compiled into the binary, even though the
WebSocket path it affects is unreachable here.
