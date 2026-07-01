import { CONFIG } from './config';
import { analyzeUrl, dedupeWarnings, homographReport } from './urlAnalysis';
import { createInMemoryRateLimiter, type RateLimiter } from './ratelimit';
import { checkRedirects, type WalkResult } from './walk';
import type { CheckResult } from './types';
import { logger } from './logger';
import { enforceMinDuration } from './timing';
import { readCappedJson } from './readBody';

export interface CheckUrlDeps {
    rateLimiter?: RateLimiter;
}

export function resolveClientKey(
    request: Request,
    headerName: string = CONFIG.trustedIpHeader
): string {
    if (!headerName) return 'anon';

    // Take the rightmost hop. A trusted proxy appends the real client IP on the
    // right, so keying off the last value stops a client from rotating its
    // bucket by prepending forged entries to an appending header.
    const parts = request.headers
        .get(headerName)
        ?.split(',')
        .map((part) => part.trim())
        .filter(Boolean);

    const last = parts?.length ? parts[parts.length - 1] : undefined;

    return last ?? 'anon';
}

export function rateLimitConfigWarning(
    headerName: string
): { event: string; fields: Record<string, unknown> } | null {
    if (headerName) return null;

    return {
        event: 'checkurl_rate_limit_degraded',
        fields: {
            reason: 'no_trusted_ip_header',
            effect: 'requests_share_one_global_bucket'
        }
    };
}

function invalidInput(): Response {
    const result: CheckResult = {
        apiVersion: 1,
        ok: false,
        warnings: [],
        error: { code: 'invalid_input', message: 'The URL is invalid.' }
    };

    return Response.json(result, { status: 400 });
}

export function methodNotAllowed(): Response {
    const result: CheckResult = {
        apiVersion: 1,
        ok: false,
        warnings: [],
        error: {
            code: 'method_not_allowed',
            message: 'Use POST to submit a URL.'
        }
    };

    return Response.json(result, { status: 405, headers: { allow: 'POST' } });
}

export function createCheckUrlHandler(
    deps: CheckUrlDeps = {}
): (request: Request) => Promise<Response> {
    const rateLimiter = deps.rateLimiter ?? createInMemoryRateLimiter();
    const warning = rateLimitConfigWarning(CONFIG.trustedIpHeader);

    if (warning) logger.warn(warning.event, warning.fields);

    let inFlight = 0;
    let rateLimitedCount = 0;
    let unavailableCount = 0;

    return async function handleCheckUrl(request: Request): Promise<Response> {
        const startedAt = Date.now();
        const clientKey = resolveClientKey(request);
        const limit = await rateLimiter.check(clientKey);
        if (!limit.allowed) {
            rateLimitedCount++;

            logger.warn('checkurl_rate_limited', { count: rateLimitedCount });

            const result: CheckResult = {
                apiVersion: 1,
                ok: false,
                warnings: [],
                error: {
                    code: 'rate_limited',
                    message: 'Too many requests. Please try again later.'
                }
            };

            return Response.json(result, {
                status: 429,
                headers: {
                    'retry-after': String(Math.ceil(limit.retryAfterMs / 1000))
                }
            });
        }

        let body: unknown;
        const bodyController = new AbortController();
        const bodyTimer = setTimeout(
            () => bodyController.abort(),
            CONFIG.timeoutMs
        );
        try {
            body = await readCappedJson(
                request.body,
                CONFIG.maxBodyBytes,
                bodyController.signal
            );
        } catch {
            return invalidInput();
        } finally {
            clearTimeout(bodyTimer);
        }
        if (typeof body !== 'object' || body === null) return invalidInput();

        const raw = (body as { url?: unknown }).url;

        if (typeof raw !== 'string') return invalidInput();

        let analysis;

        try {
            analysis = analyzeUrl(raw);
        } catch {
            return invalidInput();
        }
        const homograph = homographReport(analysis.url.hostname) ?? undefined;

        if (inFlight >= CONFIG.maxConcurrentScans) {
            unavailableCount++;
            logger.warn('checkurl_unavailable', { count: unavailableCount });
            const result: CheckResult = {
                apiVersion: 1,
                ok: false,
                warnings: [],
                error: {
                    code: 'unavailable',
                    message:
                        'The scanner is busy. Please try again in a moment.'
                }
            };

            await enforceMinDuration(startedAt, CONFIG.minResponseMs);

            return Response.json(result, {
                status: 503,
                headers: { 'retry-after': '5' }
            });
        }

        const requestId = crypto.randomUUID();
        const controller = new AbortController();
        const timer = setTimeout(
            () => controller.abort(),
            CONFIG.totalDeadlineMs
        );
        let walk: WalkResult;
        inFlight++;
        try {
            walk = await checkRedirects(analysis.url.toString(), {
                signal: controller.signal,
                requestId,
                deadlineEpoch: Date.now() + CONFIG.totalDeadlineMs
            });
        } finally {
            clearTimeout(timer);
            inFlight--;
        }

        if (walk.errorCode) {
            logger.info('checkurl_request', {
                requestId,
                ok: false,
                error: walk.errorCode
            });

            const result: CheckResult = {
                apiVersion: 1,
                ok: false,
                redirectChain: walk.chain,
                warnings: dedupeWarnings([
                    ...analysis.warnings,
                    ...walk.warnings
                ]),
                homograph,
                error: {
                    code: 'unreachable',
                    message: 'No response was received for this URL.'
                }
            };

            await enforceMinDuration(startedAt, CONFIG.minResponseMs);

            return Response.json(result, { status: 200 });
        }

        const result: CheckResult = {
            apiVersion: 1,
            ok: walk.ok,
            finalUrl: walk.finalUrl,
            status: walk.status,
            redirectChain: walk.chain,
            warnings: dedupeWarnings([...analysis.warnings, ...walk.warnings]),
            homograph
        };

        logger.info('checkurl_request', {
            requestId,
            ok: result.ok,
            error: result.error?.code
        });

        await enforceMinDuration(startedAt, CONFIG.minResponseMs);

        return Response.json(result, { status: 200 });
    };
}
