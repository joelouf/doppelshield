import { CONFIG } from './config';
import { safeRequest, assertSchemeAndPortAllowed, type LookupFn } from './ssrf';
import { analyzeHost } from './urlAnalysis';
import type { RedirectHop, Warning } from './types';
import { logger, logSsrfBlock } from './logger';

export interface WalkResult {
    ok: boolean;
    finalUrl: string;
    status: number;
    chain: RedirectHop[];
    warnings: Warning[];
    errorCode?: 'dns' | 'unreachable';
}

function assertHopAllowed(u: URL, allowedPorts: ReadonlySet<number>): void {
    assertSchemeAndPortAllowed(u, allowedPorts);
}

export async function checkRedirects(
    startUrl: string,
    opts: {
        lookup?: LookupFn;
        allowedPorts?: ReadonlySet<number>;
        signal: AbortSignal;
        requestId?: string;
        isBlocked?: (address: string, family: number) => boolean;
        deadlineEpoch?: number;
    }
): Promise<WalkResult> {
    const chain: RedirectHop[] = [];
    const warnings: Warning[] = [];
    const visited = new Set<string>();
    const allowedPorts = opts.allowedPorts ?? CONFIG.allowedPorts;

    let current: URL;
    try {
        current = new URL(startUrl);
    } catch {
        return {
            ok: false,
            finalUrl: startUrl,
            status: 0,
            chain,
            warnings,
            errorCode: 'unreachable'
        };
    }

    try {
        for (let hop = 0; ; hop++) {
            assertHopAllowed(current, allowedPorts);

            const key = current.toString();

            if (visited.has(key)) {
                warnings.push({
                    code: 'redirect_cycle',
                    detail: 'Redirect loop detected'
                });
                break;
            }
            visited.add(key);

            const remaining = opts.deadlineEpoch
                ? opts.deadlineEpoch - Date.now()
                : CONFIG.timeoutMs;
            const res = await safeRequest(key, {
                lookup: opts.lookup,
                allowedPorts,
                signal: opts.signal,
                isBlocked: opts.isBlocked,
                timeoutMs: Math.max(1, Math.min(CONFIG.timeoutMs, remaining))
            });
            chain.push({ url: key, status: res.status });

            for (const w of analyzeHost(current.hostname)) warnings.push(w);

            const isRedirect =
                res.status >= 300 && res.status < 400 && !!res.location;

            if (!isRedirect) {
                return {
                    ok: res.status >= 200 && res.status < 300,
                    finalUrl: key,
                    status: res.status,
                    chain,
                    warnings
                };
            }

            if (hop >= CONFIG.maxRedirects) {
                warnings.push({
                    code: 'max_redirects_reached',
                    detail: `Stopped after ${CONFIG.maxRedirects} redirects`
                });

                break;
            }

            let next: URL;

            try {
                next = new URL(res.location as string, current);
            } catch {
                return {
                    ok: false,
                    finalUrl: key,
                    status: res.status,
                    chain,
                    warnings,
                    errorCode: 'unreachable'
                };
            }

            if (next.toString().length > CONFIG.maxUrlLength) {
                return {
                    ok: false,
                    finalUrl: key,
                    status: res.status,
                    chain,
                    warnings,
                    errorCode: 'unreachable'
                };
            }

            if (current.protocol === 'https:' && next.protocol === 'http:') {
                warnings.push({
                    code: 'https_downgrade',
                    detail: 'Redirect downgrades HTTPS to HTTP'
                });
            }

            current = next;
        }

        const last = chain[chain.length - 1];

        return {
            ok: last ? last.status >= 200 && last.status < 300 : false,
            finalUrl: last ? last.url : current.toString(),
            status: last ? last.status : 0,
            chain,
            warnings
        };
    } catch (err) {
        const code = (err as { code?: string } | null)?.code;

        if (code === 'ESSRFBLOCKED') {
            logSsrfBlock({ requestId: opts.requestId, host: current.hostname });
        } else {
            logger.warn('checkurl_walk_error', {
                requestId: opts.requestId,
                code: code ?? 'unknown'
            });
        }

        const dnsFailure =
            code === 'ENOTFOUND' || code === 'EAI_NODATA' || code === 'ENODATA';

        return {
            ok: false,
            finalUrl: current.toString(),
            status: 0,
            chain,
            warnings,
            errorCode: dnsFailure ? 'dns' : 'unreachable'
        };
    }
}
