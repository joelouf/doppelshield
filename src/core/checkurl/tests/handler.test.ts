import { describe, it, expect } from 'vitest';
import {
    createCheckUrlHandler,
    methodNotAllowed,
    rateLimitConfigWarning,
    resolveClientKey
} from '../handler';
import { createInMemoryRateLimiter } from '../ratelimit';
import { CONFIG } from '../config';
import type { CheckResult } from '../types';

const POST = createCheckUrlHandler();
const GET = methodNotAllowed;

function reqOf(bodyText: string): Request {
    return new Request('http://localhost/api/checkUrl', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-vercel-forwarded-for': `test-${Math.random()}`
        },
        body: bodyText
    });
}
async function call(body: unknown) {
    const res = await POST(reqOf(JSON.stringify(body)));
    return {
        status: res.status,
        body: (await res.json()) as CheckResult
    };
}

describe('POST /api/checkUrl: invalid input => 400 invalid_input', () => {
    const bad: Array<[string, unknown]> = [
        ['empty string', { url: '' }],
        ['whitespace', { url: '   ' }],
        ['non-string', { url: 123 }],
        ['missing url', {}],
        ['non-http scheme', { url: 'ftp://example.com' }],
        ['non-domain gibberish', { url: 'hello' }],
        ['bare single-label host', { url: 'localhost' }]
    ];
    it.each(bad)('%s', async (_label, body) => {
        const { status, body: out } = await call(body);
        expect(status).toBe(400);
        expect(out.error?.code).toBe('invalid_input');
    });

    it('malformed JSON body', async () => {
        const res = await POST(reqOf('{not json'));
        expect(res.status).toBe(400);
        const out = (await res.json()) as CheckResult;
        expect(out.error?.code).toBe('invalid_input');
    });
});

describe('POST /api/checkUrl: homograph surfaced even when unreachable (the original bug)', () => {
    it('a non-resolving Cyrillic homoglyph returns the homograph warning, not just an error', async () => {
        const { status, body } = await call({ url: 'http://раypal.com/' });
        expect(status).toBe(200);
        expect(body.apiVersion).toBe(1);
        expect(body.warnings.map((w) => w.code)).toContain(
            'homograph_target_impersonation'
        );
        expect(['dns', 'unreachable']).toContain(body.error?.code);
        expect(body.ok).toBe(false);
    });
    it('attaches structured homograph evidence (decoded host, skeleton, glyphs)', async () => {
        const { body } = await call({ url: 'http://раypal.com/' });
        expect(body.homograph?.decodedHost).toBe('раypal.com');
        expect(body.homograph?.skeleton).toBe('paypal.com');
        expect(body.homograph?.target).toBe('paypal.com');
        expect(body.homograph?.glyphs.map((g) => g.imitates)).toEqual([
            'p',
            'a'
        ]);
    });
    it('retains the partial redirect chain when the host is unreachable', async () => {
        const { body } = await call({ url: 'http://раypal.com/' });
        expect(body.ok).toBe(false);
        expect(Array.isArray(body.redirectChain)).toBe(true);
    });
});

describe('POST /api/checkUrl: oracle uniformity (no resolution/reachability leak)', () => {
    it('a non-existent domain is indistinguishable from a blocked internal target', async () => {
        const nx = await call({
            url: `http://nope-${Math.random().toString(36).slice(2)}.example/`
        });
        const blocked = await call({ url: 'http://10.0.0.5/' });
        expect(nx.body.ok).toBe(false);
        expect(blocked.body.ok).toBe(false);
        expect(nx.status).toBe(blocked.status);
        expect(nx.body.error?.code).toBe(blocked.body.error?.code);
        expect(nx.body.error?.message).toBe(blocked.body.error?.message);
        expect(JSON.stringify(blocked.body)).not.toMatch(
            /127\.0\.0\.1|169\.254|10\.0\.0\.5|::1|localhost/
        );
    });
});

describe("POST /api/checkUrl: SSRF targets collapse to uniform 'unreachable' with no host leak", () => {
    const targets = [
        'http://127.0.0.1/',
        'http://169.254.169.254/latest/meta-data/',
        'http://10.0.0.5/',
        'http://[::1]/'
    ];
    it.each(targets)('%s', async (url) => {
        const { status, body } = await call({ url });
        expect(status).toBe(200);
        expect(body.ok).toBe(false);
        expect(body.error?.code).toBe('unreachable');
        expect(JSON.stringify(body)).not.toMatch(
            /127\.0\.0\.1|169\.254|10\.0\.0\.5|::1|localhost/
        );
        expect(body.finalUrl).toBeUndefined();
        expect(body.status).toBeUndefined();
    });
});

describe('resolveClientKey: only the trusted proxy header keys the limiter', () => {
    const withHeaders = (h: Record<string, string>) =>
        new Request('http://localhost/api/checkUrl', {
            method: 'POST',
            headers: h
        });
    it('ignores spoofable x-real-ip / x-forwarded-for so they cannot rotate the bucket', () => {
        const a = resolveClientKey(
            withHeaders({
                'x-real-ip': '1.1.1.1',
                'x-forwarded-for': '1.1.1.1'
            })
        );
        const b = resolveClientKey(
            withHeaders({
                'x-real-ip': '2.2.2.2',
                'x-forwarded-for': '2.2.2.2'
            })
        );
        expect(a).toBe(b);
    });
    it('keys off the trusted proxy header when present', () => {
        const a = resolveClientKey(
            withHeaders({ [CONFIG.trustedIpHeader]: '9.9.9.9' })
        );
        const b = resolveClientKey(
            withHeaders({ [CONFIG.trustedIpHeader]: '8.8.8.8' })
        );
        expect(a).toBe('9.9.9.9');
        expect(b).not.toBe(a);
    });
    it('keys off an explicitly provided header name (portable to any edge)', () => {
        expect(
            resolveClientKey(
                withHeaders({ 'x-real-ip': '5.5.5.5' }),
                'x-real-ip'
            )
        ).toBe('5.5.5.5');
        expect(
            resolveClientKey(
                withHeaders({ 'cf-connecting-ip': '6.6.6.6' }),
                'cf-connecting-ip'
            )
        ).toBe('6.6.6.6');
    });
    it("returns 'anon' without throwing when no trusted header is configured", () => {
        expect(
            resolveClientKey(
                withHeaders({ 'x-vercel-forwarded-for': '1.2.3.4' }),
                ''
            )
        ).toBe('anon');
    });
    it('takes the proxy-appended rightmost hop so a prepended value cannot rotate the bucket', () => {
        const a = resolveClientKey(
            withHeaders({ 'x-forwarded-for': 'spoof-1, 203.0.113.9' }),
            'x-forwarded-for'
        );
        const b = resolveClientKey(
            withHeaders({ 'x-forwarded-for': 'spoof-2, 203.0.113.9' }),
            'x-forwarded-for'
        );
        expect(a).toBe('203.0.113.9');
        expect(a).toBe(b);
    });
});

describe('rateLimitConfigWarning: an unconfigured trusted header fails loud', () => {
    it('warns about degraded shared-bucket limiting when no header is configured', () => {
        const w = rateLimitConfigWarning('');
        expect(w).not.toBeNull();
        expect(w!.event).toMatch(/degraded/);
        expect(w!.fields.reason).toBe('no_trusted_ip_header');
    });
    it('stays silent when a trusted header is configured', () => {
        expect(rateLimitConfigWarning('cf-connecting-ip')).toBeNull();
    });
});

describe('POST /api/checkUrl: rate limiting', () => {
    it('returns 429 with Retry-After once the per-client limit is exceeded', async () => {
        const ip = `ratelimit-victim-${Math.random()}`;
        const limiter = createInMemoryRateLimiter();
        const handler = createCheckUrlHandler({ rateLimiter: limiter });
        const make = () =>
            new Request('http://localhost/api/checkUrl', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-vercel-forwarded-for': ip
                },
                body: JSON.stringify({ url: 'ftp://invalid' })
            });
        let res: Response | undefined;
        for (let i = 0; i < CONFIG.rateLimit.max + 1; i++)
            res = await handler(make());
        expect(res!.status).toBe(429);
        expect(res!.headers.get('retry-after')).toBeTruthy();
        const body = (await res!.json()) as CheckResult;
        expect(body.error?.code).toBe('rate_limited');
    });
});

describe('POST /api/checkUrl: request hardening', () => {
    it('rejects an oversized body with 400 invalid_input', async () => {
        const big = JSON.stringify({
            url: 'http://example.com/' + 'a'.repeat(9000)
        });
        const res = await POST(
            new Request('http://localhost/api/checkUrl', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'content-length': String(big.length),
                    'x-vercel-forwarded-for': `big-${Math.random()}`
                },
                body: big
            })
        );
        expect(res.status).toBe(400);
        const out = (await res.json()) as CheckResult;
        expect(out.error?.code).toBe('invalid_input');
    });
});

describe('checkUrl: non-POST methods => 405 method_not_allowed', () => {
    it('GET returns a uniform 405 CheckResult with Allow: POST', async () => {
        const res = GET();
        expect(res.status).toBe(405);
        expect(res.headers.get('allow')).toBe('POST');
        const out = (await res.json()) as CheckResult;
        expect(out.apiVersion).toBe(1);
        expect(out.error?.code).toBe('method_not_allowed');
    });
});

describe('createCheckUrlHandler: framework-agnostic contract', () => {
    it('returns a Web Response and honors an injected rate limiter', async () => {
        let calls = 0;
        const handler = createCheckUrlHandler({
            rateLimiter: {
                check() {
                    calls++;
                    return { allowed: false, retryAfterMs: 1000 };
                }
            }
        });
        const res = await handler(
            new Request('http://localhost/api/checkUrl', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ url: 'http://example.com/' })
            })
        );
        expect(res).toBeInstanceOf(Response);
        expect(res.status).toBe(429);
        expect(calls).toBe(1);
        const out = (await res.json()) as CheckResult;
        expect(out.error?.code).toBe('rate_limited');
    });
});
