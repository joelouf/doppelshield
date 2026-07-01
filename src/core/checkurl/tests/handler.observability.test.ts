import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
    type MockInstance
} from 'vitest';
import { createCheckUrlHandler } from '../handler';
import { CONFIG } from '../config';
import { logger } from '../logger';
import * as timing from '../timing';

function postReq(url: unknown, ip: string): Request {
    return new Request('http://localhost/api/checkUrl', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-vercel-forwarded-for': ip
        },
        body: JSON.stringify({ url })
    });
}

describe('L-7: pre-network bailouts are not a coarse timing oracle', () => {
    let enforceSpy: MockInstance<typeof timing.enforceMinDuration>;

    beforeEach(() => {
        enforceSpy = vi
            .spyOn(timing, 'enforceMinDuration')
            .mockResolvedValue(undefined);
    });
    afterEach(() => {
        enforceSpy.mockRestore();
    });

    it('pads the 503 unavailable path through the timing floor', async () => {
        const handler = createCheckUrlHandler({
            rateLimiter: { check: () => ({ allowed: true, retryAfterMs: 0 }) }
        });
        const stall = new Promise(() => {});
        const slow = vi
            .spyOn(globalThis, 'fetch')
            .mockImplementation(() => stall as Promise<Response>);
        try {
            const inflight: Array<Promise<Response>> = [];
            for (let i = 0; i < CONFIG.maxConcurrentScans; i++) {
                inflight.push(
                    handler(postReq('http://example.com/', `fill-${i}`))
                );
            }
            const res = await handler(
                postReq('http://example.com/', 'overflow')
            );
            expect(res.status).toBe(503);
            expect(enforceSpy).toHaveBeenCalled();
            void inflight;
        } finally {
            slow.mockRestore();
        }
    });

    it('does not pad the 400 invalid_input path (deliberate exclusion)', async () => {
        const handler = createCheckUrlHandler({
            rateLimiter: { check: () => ({ allowed: true, retryAfterMs: 0 }) }
        });
        const res = await handler(postReq('ftp://example.com', 'bad-input'));
        expect(res.status).toBe(400);
        expect(enforceSpy).not.toHaveBeenCalled();
    });
});

describe('N-5: abuse and saturation bailouts emit a counted log event', () => {
    let warnSpy: MockInstance<typeof logger.warn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(logger, 'warn').mockReturnValue(undefined);
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('logs a counted event when a request is rate limited (429)', async () => {
        const handler = createCheckUrlHandler({
            rateLimiter: {
                check: () => ({ allowed: false, retryAfterMs: 1000 })
            }
        });
        const res = await handler(postReq('http://example.com/', 'rl'));
        expect(res.status).toBe(429);
        const event = warnSpy.mock.calls.find(
            ([name]) => name === 'checkurl_rate_limited'
        );
        expect(event).toBeDefined();
        expect(typeof event![1]!.count).toBe('number');
    });

    it('logs a counted event when the scanner sheds load (503)', async () => {
        const handler = createCheckUrlHandler({
            rateLimiter: { check: () => ({ allowed: true, retryAfterMs: 0 }) }
        });
        const stall = new Promise(() => {});
        const slow = vi
            .spyOn(globalThis, 'fetch')
            .mockImplementation(() => stall as Promise<Response>);
        try {
            const inflight: Array<Promise<Response>> = [];
            for (let i = 0; i < CONFIG.maxConcurrentScans; i++) {
                inflight.push(
                    handler(postReq('http://example.com/', `fill-${i}`))
                );
            }
            const res = await handler(
                postReq('http://example.com/', 'overflow')
            );
            expect(res.status).toBe(503);
            const event = warnSpy.mock.calls.find(
                ([name]) => name === 'checkurl_unavailable'
            );
            expect(event).toBeDefined();
            expect(typeof event![1]!.count).toBe('number');
            void inflight;
        } finally {
            slow.mockRestore();
        }
    });
});
