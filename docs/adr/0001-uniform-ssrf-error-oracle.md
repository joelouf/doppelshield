# 1. Uniform error response so checkUrl is not an SSRF oracle

Status: Accepted

Date: 2026-06-30

## Context

The checkUrl endpoint fetches a user supplied URL server side to inspect its
redirect chain and final destination. Any endpoint that fetches attacker
controlled URLs is a server side request forgery surface: an attacker can point
it at internal hosts, link local metadata addresses, or private ranges and use
the response to map a network they cannot reach directly.

Address level defenses already exist in src/core/checkurl/ssrf.ts: DNS results
are screened against a net.BlockList covering loopback, private, link local,
carrier grade NAT, and reserved ranges for both IPv4 and IPv6, the resolved
address is pinned for the actual connection, and only http and https on an
allowed port set are permitted. Blocking the connection is necessary but not
sufficient. If the endpoint reports a different error code, a different message,
a different latency, or a different response shape depending on why a fetch
failed, those differences are themselves an oracle. An attacker can distinguish
"host does not resolve" from "host resolves but is blocked" from "host resolves,
is reachable, and refused the connection" and recover the same internal
information the block list was meant to deny.

The walk layer in src/core/checkurl/walk.ts does classify failures internally:
WalkResult carries an errorCode of either 'dns' or 'unreachable', derived from
the underlying Node error code (ENOTFOUND and friends map to 'dns', everything
else including the ESSRFBLOCKED sentinel maps to 'unreachable'). That internal
distinction is useful for server side logging but must not reach the client.

## Decision

Every walk failure collapses to a single client facing error at the
handler boundary. In src/core/checkurl/handler.ts, when walk.errorCode is set
for any reason, the handler returns one fixed shape: HTTP 200 with an error
object whose code is 'unreachable' and whose message is the constant
"No response was received for this URL." The internal 'dns' classification from
walk.ts is never forwarded; the public error code union in
src/core/checkurl/types.ts does not contain a 'dns' member, so the distinction
cannot be expressed in a response.

The error path never emits finalUrl. The error CheckResult built in
handler.ts omits finalUrl and status entirely; those fields are populated only
on the success result. A blocked or failed fetch therefore cannot leak the host
the scanner resolved or attempted to contact.

Timing is equalized. enforceMinDuration in src/core/checkurl/timing.ts pads
every terminal response, error and success alike, up to a constant floor
(CONFIG.minResponseMs) measured from the start of the request. A fast local
refusal and a slow external timeout return after the same minimum wall clock
time, removing latency as a side channel. The block decision itself is recorded
server side via logSsrfBlock with the request id and host, so operators retain
visibility that the client does not.

## Consequences

A caller cannot use checkUrl to probe internal infrastructure. Whether a target
fails to resolve, resolves into a blocked range, or simply does not answer, the
response is byte for byte the same error and arrives no sooner than the timing
floor. The address screening in ssrf.ts and the uniform boundary in handler.ts
reinforce each other: even a future gap in the block list would not produce a
distinguishable response.

The cost is reduced diagnostic fidelity for legitimate users. A real typo in a
domain and a genuinely unreachable host yield the identical "No response was
received" message, so the UI cannot tell the user which one occurred. This is an
accepted trade-off; for a security tool the oracle risk outweighs the
convenience of a precise client side error.

The internal 'dns' classification in walk.ts now exists only to drive logging
and is intentionally dead with respect to the response. Anyone extending the
handler must preserve the invariant that no walk failure path adds finalUrl,
status, or a more specific error code to the client result, and that every
terminal path passes through enforceMinDuration before returning.
