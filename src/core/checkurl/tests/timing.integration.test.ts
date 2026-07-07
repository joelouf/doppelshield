import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
});

function blockedRequest(): Request {
    return new Request('http://localhost/api/checkUrl', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-vercel-forwarded-for': `floor-${Math.random()}`
        },
        body: JSON.stringify({ url: 'http://127.0.0.1/' })
    });
}

describe('POST: constant-time response floor (end-to-end wiring)', () => {
    it('pads a fast blocked-target response up to CHECKURL_MIN_RESPONSE_MS', async () => {
        vi.stubEnv('CHECKURL_MIN_RESPONSE_MS', '300');
        vi.resetModules();
        const { createCheckUrlHandler } = await import('../handler');
        const POST = createCheckUrlHandler();

        const t0 = Date.now();
        const res = await POST(blockedRequest());
        const elapsed = Date.now() - t0;

        expect(res.status).toBe(200);
        expect(elapsed).toBeGreaterThanOrEqual(290);
    });

    it('does not pad when the floor is disabled (0)', async () => {
        vi.stubEnv('CHECKURL_MIN_RESPONSE_MS', '0');
        vi.resetModules();
        const { createCheckUrlHandler } = await import('../handler');
        const POST = createCheckUrlHandler();

        const t0 = Date.now();
        const res = await POST(blockedRequest());
        const elapsed = Date.now() - t0;

        expect(res.status).toBe(200);
        expect(elapsed).toBeLessThan(290);
    });
});
