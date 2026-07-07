import { describe, it, expect, afterEach, vi } from 'vitest';
import { createInMemoryRateLimiter, type RateLimitResult } from '../ratelimit';
import { CONFIG } from '../config';

const sync = (r: RateLimitResult | Promise<RateLimitResult>) =>
    r as RateLimitResult;

afterEach(() => {
    vi.useRealTimers();
});

describe('createInMemoryRateLimiter (fixed window, in-process)', () => {
    it('allows the first request from a fresh key', () => {
        const rl = createInMemoryRateLimiter();
        expect(sync(rl.check('fresh')).allowed).toBe(true);
    });
    it('allows up to max, then denies with a positive retryAfter', () => {
        const rl = createInMemoryRateLimiter();
        let last: RateLimitResult = { allowed: true, retryAfterMs: 0 };
        for (let i = 0; i < CONFIG.rateLimit.max + 1; i++)
            last = sync(rl.check('burst'));
        expect(last.allowed).toBe(false);
        expect(last.retryAfterMs).toBeGreaterThan(0);
    });
    it('keeps separate counters per key', () => {
        const rl = createInMemoryRateLimiter();
        for (let i = 0; i < CONFIG.rateLimit.max + 1; i++) void rl.check('a');
        expect(sync(rl.check('b')).allowed).toBe(true);
    });
    it('isolates state between limiter instances', () => {
        const a = createInMemoryRateLimiter({ max: 1, windowMs: 60000 });
        const b = createInMemoryRateLimiter({ max: 1, windowMs: 60000 });
        void a.check('k');
        expect(sync(a.check('k')).allowed).toBe(false);
        expect(sync(b.check('k')).allowed).toBe(true);
    });

    it('evicts an expired bucket before any active one when full', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const rl = createInMemoryRateLimiter({
            max: 1,
            windowMs: 1000,
            maxTrackedKeys: 2
        });
        void rl.check('expired');
        vi.setSystemTime(500);
        void rl.check('active');
        expect(sync(rl.check('active')).allowed).toBe(false);

        vi.setSystemTime(1200);
        void rl.check('newcomer');

        expect(rl.has('expired')).toBe(false);
        expect(rl.has('active')).toBe(true);
        expect(rl.has('newcomer')).toBe(true);
        expect(sync(rl.check('active')).allowed).toBe(false);
    });

    it('evicts the smallest-resetAt active bucket even when it is the newest-inserted', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const rl = createInMemoryRateLimiter({
            max: 1,
            windowMs: 1000,
            maxTrackedKeys: 2
        });
        void rl.check('oldKey');
        void rl.check('youngKey');

        vi.setSystemTime(2000);
        void rl.check('youngKey');
        vi.setSystemTime(2050);
        void rl.check('oldKey');

        vi.setSystemTime(2100);
        expect(sync(rl.check('oldKey')).allowed).toBe(false);
        expect(sync(rl.check('youngKey')).allowed).toBe(false);

        vi.setSystemTime(2100);
        void rl.check('newcomer');

        expect(rl.has('oldKey')).toBe(true);
        expect(rl.has('youngKey')).toBe(false);
        expect(sync(rl.check('oldKey')).allowed).toBe(false);
    });

    it('sweeps expired buckets before reaching the capacity threshold', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const rl = createInMemoryRateLimiter({
            max: 5,
            windowMs: 1000,
            maxTrackedKeys: 1_000_000
        });
        void rl.check('ephemeral');
        expect(rl.has('ephemeral')).toBe(true);

        vi.setSystemTime(2000);
        for (let i = 0; i < 500; i++) void rl.check(`other-${i}`);
        expect(rl.has('ephemeral')).toBe(false);
    });
});
