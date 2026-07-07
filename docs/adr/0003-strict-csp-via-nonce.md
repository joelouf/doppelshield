# 3. Strict Content-Security-Policy via a per-request nonce

Status: Accepted

Date: 2026-06-30

## Context

The application renders user supplied input back into the page: a pasted URL,
its decoded host, per glyph evidence, and a redirect chain. Any surface that
reflects attacker influenced text is a cross site scripting target. A Content
Security Policy is the second line of defense behind output encoding: even if a
markup injection slipped through, a strict policy decides whether an injected
script is allowed to run.

The weak form of a script policy is an allowlist of origins combined with
'unsafe-inline'. That combination is close to no protection at all, because an
injected inline script is inline and therefore allowed. The framework also emits
its own bootstrap and hydration scripts, so a naive 'self' only policy would
break the application. The two forces in tension are blocking injected scripts
while still permitting the framework's own scripts to execute.

A nonce based policy resolves this. A fresh unguessable value is minted per
request, attached to every script the application legitimately emits, and named
in the policy. An attacker writing markup into the response cannot predict the
nonce, so an injected script carries no valid nonce and is refused. This only
holds if the nonce is genuinely per request, which forces the response to be
dynamically rendered rather than statically cached.

## Decision

A strict Content Security Policy is set on every document response from
proxy.ts, built by buildContentSecurityPolicy in src/lib/csp.ts.

For each request, src/proxy.ts mints a nonce with btoa(crypto.randomUUID()),
passes it to the policy builder, sets it on the inbound request as the x-nonce
header so server components can read it, and sets the resulting policy as the
Content-Security-Policy response header. The proxy matcher excludes API routes
and the static asset paths under _next, so the policy is applied to rendered
documents.

The script-src directive in src/lib/csp.ts is
"'self' 'nonce-${nonce}' 'strict-dynamic'". The nonce admits the framework's own
scripts; 'strict-dynamic' propagates that trust to scripts those trusted scripts
load, which is how the framework's chunk loading continues to work without an
origin allowlist; and there is no 'unsafe-inline', so an injected inline script
without the nonce cannot run. 'unsafe-eval' is added only when isDev is true, to
keep the development tooling working, and is absent from production responses.

The rest of the policy is locked down: default-src 'self', object-src 'none',
frame-ancestors 'none', base-uri 'self', form-action 'self', img-src and
font-src limited to 'self' and data:, connect-src limited to 'self' and the
Formspree endpoint the contact form submits to, plus upgrade-insecure-requests.

Because the nonce must differ on every response, the root layout in
src/app/layout.tsx calls connection() before rendering, which opts the document
out of static optimization and forces a dynamic render per request. A statically
cached document would reuse a single nonce across visitors and defeat the
mechanism.

## Consequences

An injected inline script in any reflected field cannot execute: it lacks the
per request nonce, and the absence of 'unsafe-inline' means there is no fallback
that would let it run. The framework keeps working because its scripts carry the
nonce and 'strict-dynamic' covers what they load. The lockdown directives remove
the common escalation paths: no plugins or embeds (object-src 'none'), no
framing of the app (frame-ancestors 'none'), no base tag hijack (base-uri
'self'), and no off origin form posts (form-action 'self').

The cost is that document responses cannot be statically cached, since
connection() forces a dynamic render to keep the nonce unique. For this
application, which is interactive and already renders per request, that is not a
meaningful loss.

A residual relaxation remains in style-src, which is "'self' 'unsafe-inline'".
Inline styles are still permitted, so this policy hardens script execution but
not style injection. Tightening style-src to a nonce or hash based form is
follow up work; it was left open because the framework and the styling approach
emit inline styles that a nonce only style policy would break.

Anyone extending the policy must keep three invariants: the nonce stays per
request (do not reintroduce static rendering of documents that carry it), no
'unsafe-inline' returns to script-src, and any new external origin the app must
reach is added explicitly to the narrow connect-src rather than widening
default-src.

Note on scope: an earlier description of this decision referred to a sha256 hash
covering a static theme initialization inline script alongside the nonce. The
live code carries no such script and no hash; src/app/layout.tsx contains no
inline theme script, and src/lib/csp.ts derives script-src from the nonce and
'strict-dynamic' only. This record describes the policy as implemented. If an
inline bootstrap script is reintroduced later, it should be admitted by a
sha256 source expression in script-src rather than by relaxing the policy, and a
new ADR should record that change.
