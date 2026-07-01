import { describe, it, expect } from 'vitest';
import http from 'node:http';
import dns from 'node:dns';
import { checkRedirects } from '../walk';
import { CONFIG } from '../config';
import type { LookupFn } from '../ssrf';

type Srv = { port: number; url: string; close: () => Promise<void> };
function startServer(
    handler: (req: http.IncomingMessage, res: http.ServerResponse) => void
): Promise<Srv> {
    return new Promise((resolve) => {
        const server = http.createServer(handler);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address() as { port: number };
            resolve({
                port,
                url: `http://127.0.0.1:${port}/`,
                close: () =>
                    new Promise<void>((r) => {
                        server.closeAllConnections?.();
                        server.close(() => r());
                    })
            });
        });
    });
}
const allowAll: LookupFn = (h, o, cb) =>
    dns.lookup(h, { ...o, all: true }, (e, a) =>
        e ? cb(e, '', 0) : cb(null, a)
    );
function deadline(ms = 5000): AbortSignal {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), ms);
    t.unref?.();
    return ac.signal;
}

describe('checkRedirects (hermetic, DI lookup + allowedPorts)', () => {
    it('follows a redirect chain and records each hop', async () => {
        const b = await startServer((_q, r) => {
            r.statusCode = 200;
            r.end('ok');
        });
        const a = await startServer((_q, r) => {
            r.statusCode = 302;
            r.setHeader('location', b.url);
            r.end();
        });
        try {
            const walk = await checkRedirects(a.url, {
                lookup: allowAll,
                isBlocked: () => false,
                allowedPorts: new Set([a.port, b.port]),
                signal: deadline()
            });
            expect(walk.errorCode).toBeUndefined();
            expect(walk.ok).toBe(true);
            expect(walk.chain.length).toBe(2);
            expect(walk.finalUrl).toBe(b.url);
            expect(walk.status).toBe(200);
        } finally {
            await a.close();
            await b.close();
        }
    });

    it('stops at MAX_REDIRECTS and warns', async () => {
        const s = await startServer((q, r) => {
            const n = Number((q.url || '/0').slice(1)) || 0;
            r.statusCode = 302;
            r.setHeader('location', `/${n + 1}`);
            r.end();
        });
        try {
            const walk = await checkRedirects(`${s.url}0`, {
                lookup: allowAll,
                isBlocked: () => false,
                allowedPorts: new Set([s.port]),
                signal: deadline()
            });
            expect(walk.warnings.map((w) => w.code)).toContain(
                'max_redirects_reached'
            );
        } finally {
            await s.close();
        }
    });

    it('detects a redirect cycle and terminates', async () => {
        const servers: { a?: Srv; b?: Srv } = {};
        servers.a = await startServer((_q, r) => {
            r.statusCode = 302;
            r.setHeader('location', servers.b!.url);
            r.end();
        });
        servers.b = await startServer((_q, r) => {
            r.statusCode = 302;
            r.setHeader('location', servers.a!.url);
            r.end();
        });
        try {
            const walk = await checkRedirects(servers.a.url, {
                lookup: allowAll,
                isBlocked: () => false,
                allowedPorts: new Set([servers.a.port, servers.b.port]),
                signal: deadline()
            });
            expect(walk.warnings.map((w) => w.code)).toContain(
                'redirect_cycle'
            );
        } finally {
            await servers.a.close();
            await servers.b.close();
        }
    });

    it('flags a homoglyph host introduced by a redirect destination', async () => {
        const homoHost = new URL('http://раypal.com/').hostname;
        const toLoopback: LookupFn = (_h, o, cb) =>
            dns.lookup('127.0.0.1', { ...o, all: true }, (e, a) =>
                e ? cb(e, '', 0) : cb(null, a)
            );
        const dest = await startServer((_q, r) => {
            r.statusCode = 200;
            r.end('ok');
        });
        const a = await startServer((_q, r) => {
            r.statusCode = 302;
            r.setHeader('location', `http://${homoHost}:${dest.port}/`);
            r.end();
        });
        try {
            const walk = await checkRedirects(a.url, {
                lookup: toLoopback,
                isBlocked: () => false,
                allowedPorts: new Set([a.port, dest.port]),
                signal: deadline()
            });
            expect(walk.warnings.map((w) => w.code)).toContain(
                'homograph_target_impersonation'
            );
        } finally {
            await a.close();
            await dest.close();
        }
    });

    it('rejects an over-long redirect Location and does not continue the walk', async () => {
        const longPath = '/' + 'a'.repeat(CONFIG.maxUrlLength + 100);
        let secondHopHits = 0;
        const a = await startServer((q, r) => {
            if (q.url === '/') {
                r.statusCode = 302;
                r.setHeader('location', longPath);
                r.end();
                return;
            }
            secondHopHits++;
            r.statusCode = 200;
            r.end('ok');
        });
        try {
            const walk = await checkRedirects(a.url, {
                lookup: allowAll,
                isBlocked: () => false,
                allowedPorts: new Set([a.port]),
                signal: deadline()
            });
            expect(walk.errorCode).toBe('unreachable');
            expect(walk.chain.length).toBe(1);
            expect(secondHopHits).toBe(0);
        } finally {
            await a.close();
        }
    });

    it('rejects a redirect to a disallowed port before recording the hop', async () => {
        const a = await startServer((_q, r) => {
            r.statusCode = 302;
            r.setHeader('location', 'http://127.0.0.1:6379/');
            r.end();
        });
        try {
            const walk = await checkRedirects(a.url, {
                lookup: allowAll,
                isBlocked: () => false,
                allowedPorts: new Set([a.port]),
                signal: deadline()
            });
            expect(walk.errorCode).toBe('unreachable');
            expect(walk.chain.length).toBe(1);
            expect(walk.chain[0]!.url).toBe(a.url);
        } finally {
            await a.close();
        }
    });

    it('returns a clean 200 result', async () => {
        const s = await startServer((_q, r) => {
            r.statusCode = 200;
            r.end('hi');
        });
        try {
            const walk = await checkRedirects(s.url, {
                lookup: allowAll,
                isBlocked: () => false,
                allowedPorts: new Set([s.port]),
                signal: deadline()
            });
            expect(walk.ok).toBe(true);
            expect(walk.status).toBe(200);
            expect(walk.chain.length).toBe(1);
        } finally {
            await s.close();
        }
    });

    it('collapses an aborted (deadline) walk to errorCode unreachable', async () => {
        const s = await startServer(() => {});
        try {
            const walk = await checkRedirects(s.url, {
                lookup: allowAll,
                isBlocked: () => false,
                allowedPorts: new Set([s.port]),
                signal: deadline(100)
            });
            expect(walk.errorCode).toBe('unreachable');
        } finally {
            await s.close();
        }
    });
});
