import { describe, it, expect } from 'vitest';
import http from 'node:http';
import dns from 'node:dns';
import { safeRequest, type LookupFn } from '../ssrf';

type Server = { port: number; hits: number; close: () => Promise<void> };

function startServer(
    handler: (req: http.IncomingMessage, res: http.ServerResponse) => void
): Promise<Server> {
    return new Promise((resolve) => {
        const state = { hits: 0 };
        const server = http.createServer((req, res) => {
            state.hits++;
            handler(req, res);
        });
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address() as { port: number };
            resolve({
                port,
                get hits() {
                    return state.hits;
                },
                close: () => new Promise<void>((r) => server.close(() => r()))
            });
        });
    });
}

const allowAllLookup: LookupFn = (hostname, options, cb) => {
    dns.lookup(hostname, { ...options, all: true }, (err, addrs) => {
        if (err) return cb(err, '', 0);
        if (options && options.all) return cb(null, addrs);
        const first = addrs[0]!;
        return cb(null, first.address, first.family);
    });
};

describe('safeRequest: connect-time SSRF blocking (Flaw A: rebinding/TOCTOU)', () => {
    it('blocks a request to a loopback IP literal', async () => {
        const srv = await startServer((_req, res) => res.end('secret'));
        try {
            await expect(
                safeRequest(`http://127.0.0.1:${srv.port}/`, {
                    allowedPorts: new Set([srv.port])
                })
            ).rejects.toThrow();
            expect(srv.hits).toBe(0);
        } finally {
            await srv.close();
        }
    });

    it('blocks a hostname that resolves to a private address (the resolved IP governs)', async () => {
        const srv = await startServer((_req, res) => res.end('secret'));
        try {
            await expect(
                safeRequest(`http://localhost:${srv.port}/`, {
                    allowedPorts: new Set([srv.port])
                })
            ).rejects.toThrow();
            expect(srv.hits).toBe(0);
        } finally {
            await srv.close();
        }
    });
});

describe('safeRequest: connect-time re-validation (defeats a rebinding lookup)', () => {
    it('rejects a resolved address that is blocked even when the lookup permits it', async () => {
        const rebindLookup: LookupFn = (_hostname, _options, cb) =>
            cb(null, [{ address: '169.254.169.254', family: 4 }]);
        await expect(
            safeRequest('http://attacker.example/', {
                lookup: rebindLookup,
                allowedPorts: new Set([80])
            })
        ).rejects.toMatchObject({ code: 'ESSRFBLOCKED' });
    });
});

describe('safeRequest: non-array lookup fallback derives family from the resolved address form', () => {
    it('blocks a v6 loopback returned as a single string for a colon-less hostname', async () => {
        const v6LoopbackLookup: LookupFn = (_hostname, _options, cb) =>
            cb(null, '::1', 0);
        await expect(
            safeRequest('http://attacker.example/', {
                lookup: v6LoopbackLookup,
                allowedPorts: new Set([80])
            })
        ).rejects.toMatchObject({ code: 'ESSRFBLOCKED' });
    });

    it('does not falsely block a public v6 returned as a single string for a colon-less hostname', async () => {
        const v6PublicLookup: LookupFn = (_hostname, _options, cb) =>
            cb(null, '2606:4700:4700::1111', 0);
        await expect(
            safeRequest('http://public.example/', {
                lookup: v6PublicLookup,
                allowedPorts: new Set([80]),
                timeoutMs: 200
            })
        ).rejects.not.toMatchObject({ code: 'ESSRFBLOCKED' });
    });
});

describe('safeRequest: port allowlist', () => {
    it('refuses a non-allowlisted port even with a permissive lookup', async () => {
        await expect(
            safeRequest('http://127.0.0.1:6379/', { lookup: allowAllLookup })
        ).rejects.toThrow(/port/i);
    });
    it('refuses an explicit :0 port', async () => {
        await expect(
            safeRequest('http://example.com:0/', { lookup: allowAllLookup })
        ).rejects.toThrow(/port/i);
    });
});

describe('safeRequest: redirects are NOT auto-followed (Flaw B)', () => {
    it('returns the 3xx response and its Location instead of following it', async () => {
        const srv = await startServer((_req, res) => {
            res.statusCode = 302;
            res.setHeader(
                'location',
                'http://169.254.169.254/latest/meta-data/'
            );
            res.end();
        });
        try {
            const result = await safeRequest(`http://127.0.0.1:${srv.port}/`, {
                lookup: allowAllLookup,
                allowedPorts: new Set([srv.port]),
                isBlocked: () => false
            });
            expect(result.status).toBe(302);
            expect(result.location).toBe(
                'http://169.254.169.254/latest/meta-data/'
            );
            expect(srv.hits).toBe(1);
        } finally {
            await srv.close();
        }
    });

    it('reports a normal 200 with no location', async () => {
        const srv = await startServer((_req, res) => {
            res.statusCode = 200;
            res.end('ok');
        });
        try {
            const result = await safeRequest(`http://127.0.0.1:${srv.port}/`, {
                lookup: allowAllLookup,
                allowedPorts: new Set([srv.port]),
                isBlocked: () => false
            });
            expect(result.status).toBe(200);
            expect(result.location).toBeNull();
        } finally {
            await srv.close();
        }
    });
});

describe('safeRequest: AbortSignal deadline', () => {
    it('rejects an in-flight request when the signal fires', async () => {
        const srv = await startServer(() => {});
        try {
            const ac = new AbortController();
            const timer = setTimeout(() => ac.abort(), 100);
            await expect(
                safeRequest(`http://127.0.0.1:${srv.port}/`, {
                    lookup: allowAllLookup,
                    allowedPorts: new Set([srv.port]),
                    signal: ac.signal,
                    isBlocked: () => false
                })
            ).rejects.toThrow();
            clearTimeout(timer);
        } finally {
            await srv.close();
        }
    });

    it('rejects before resolving/connecting if the signal is already aborted (deadline covers DNS)', async () => {
        const ac = new AbortController();
        ac.abort();
        await expect(
            safeRequest('http://example.com/', { signal: ac.signal })
        ).rejects.toThrow();
    });
});
