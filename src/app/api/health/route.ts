// Liveness and readiness probe for orchestrators and the container HEALTHCHECK.
// Deliberately minimal: the scanner has no backing services, so "the process
// accepts a request and serves a route" is the entire health story. It reveals
// no version, uptime, or config, and it sits outside the checkUrl rate limiter
// so a probe can never be throttled by scan traffic.
export const dynamic = 'force-dynamic';

export function GET(): Response {
    return Response.json({ status: 'ok' });
}
