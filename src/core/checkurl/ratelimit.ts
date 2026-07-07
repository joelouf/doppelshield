import { CONFIG } from './config';

export type RateLimitResult = { allowed: boolean; retryAfterMs: number };

export interface RateLimiter {
    check(key: string): RateLimitResult | Promise<RateLimitResult>;

    has?(key: string): boolean;
}

type Bucket = { count: number; resetAt: number };

export function createInMemoryRateLimiter(opts?: {
    max?: number;
    windowMs?: number;
    maxTrackedKeys?: number;
}): RateLimiter & { has(key: string): boolean } {
    const max = opts?.max ?? CONFIG.rateLimit.max;
    const windowMs = opts?.windowMs ?? CONFIG.rateLimit.windowMs;
    const maxTrackedKeys = opts?.maxTrackedKeys ?? 10_000;
    const buckets = new Map<string, Bucket>();

    function dropExpired(now: number): void {
        for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
    }

    let sinceSweep = 0;
    const sweepInterval = 256;

    return {
        check(key: string): RateLimitResult {
            const now = Date.now();

            if (++sinceSweep >= sweepInterval) {
                sinceSweep = 0;
                dropExpired(now);
            }

            if (buckets.size >= maxTrackedKeys && !buckets.has(key)) {
                dropExpired(now);
                while (buckets.size >= maxTrackedKeys) {
                    let victim: string | undefined;
                    let soonest = Infinity;
                    for (const [k, b] of buckets) {
                        if (b.resetAt < soonest) {
                            soonest = b.resetAt;
                            victim = k;
                        }
                    }
                    if (victim === undefined) break;
                    buckets.delete(victim);
                }
            }

            let bucket = buckets.get(key);

            if (!bucket || now >= bucket.resetAt) {
                bucket = { count: 0, resetAt: now + windowMs };
                buckets.set(key, bucket);
            }

            if (bucket.count >= max) {
                return {
                    allowed: false,
                    retryAfterMs: Math.max(0, bucket.resetAt - now)
                };
            }

            bucket.count++;

            return { allowed: true, retryAfterMs: 0 };
        },
        has(key: string): boolean {
            return buckets.has(key);
        }
    };
}
