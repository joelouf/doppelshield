# 4. Framework agnostic checkUrl core with a thin Next adapter

Status: Accepted

Date: 2026-06-30

## Context

The scanning engine is the substance of this project: URL parsing, homograph and
confusable analysis, SSRF safe DNS resolution and connection pinning, redirect
walking, rate limiting, concurrency limiting, and uniform error and timing
handling. The HTTP framework that exposes it is incidental. Coupling that engine
to Next.js route internals would make it hard to test in isolation, hard to
reuse from a different runtime, and would invite framework specific objects
(route context, framework request wrappers) to leak into security sensitive
code where their exact semantics matter.

The engine must depend only on stable, portable contracts: the Web
standard Request and Response, the Web Crypto and AbortController globals, and
Node builtins (node:http, node:https, node:dns, node:net) for the parts that are
inherently server side. The framework layer must be a thin shell that
supplies nothing but wiring.

## Decision

The entire engine stays in src/core/checkurl/ as framework agnostic code,
following a ports and adapters arrangement. The core exposes a factory,
createCheckUrlHandler in src/core/checkurl/handler.ts, that returns a
handler with the signature (request: Request) => Promise<Response>. It takes Web
standard Request and Response and nothing from any framework. Its dependencies
are injected through a CheckUrlDeps argument (currently an optional RateLimiter),
which defaults to an in memory implementation, so the core can be driven with a
test double and has no hidden global wiring. The core also exports
methodNotAllowed as a ready made Response for unsupported verbs. Nothing under
src/core/checkurl/ imports from next or from the app directory.

The Next.js route at src/app/api/checkUrl/route.ts is the adapter. It is
deliberately thin: it imports createCheckUrlHandler and methodNotAllowed from
the core, binds POST to createCheckUrlHandler() and the other verbs (GET, PUT,
PATCH, DELETE, OPTIONS) to methodNotAllowed, and sets the route segment config
(dynamic = 'force-dynamic' and maxDuration = 15). It contains no scanning logic.
Because Next.js App Router route handlers already receive and return Web standard
Request and Response, the handler the core returns is itself a valid route
export with no wrapping required.

## Consequences

The engine is testable without booting a framework. The handler can be exercised
by constructing a Request and asserting on the returned Response, which is how
the core test suite under src/core/checkurl/ drives it, and dependencies like the
rate limiter can be swapped for deterministic doubles through CheckUrlDeps.

The engine is portable. Any runtime that speaks Web standard Request and Response
can mount the same handler; moving to a different host means writing a new
adapter as small as route.ts, not touching the security critical code. The Node
builtins used in ssrf.ts keep the core tied to a Node compatible server runtime,
which is acceptable because the SSRF defenses depend on low level socket and DNS
control that the Web platform does not expose.

The boundary must be kept honest. The value of this split collapses if framework
specifics seep into the core, so reviewers should reject any next import or
app directory dependency under src/core/checkurl/, and any new transport (a CLI,
a queue worker, another framework) should be added as a sibling adapter that
calls createCheckUrlHandler rather than by reaching into the engine.
