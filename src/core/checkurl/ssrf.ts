import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import { CONFIG } from './config';

const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.88.99.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4]
];

const BLOCKED_V6: ReadonlyArray<readonly [string, number]> = [
    ['::1', 128],
    ['::', 128],
    ['::', 96],
    ['64:ff9b::', 96],
    ['100::', 64],
    ['2001::', 32],
    ['2001:db8::', 32],
    ['2002::', 16],
    ['fc00::', 7],
    ['fe80::', 10],
    ['fec0::', 10],
    ['ff00::', 8]
];

const blockList = new net.BlockList();
for (const [addr, prefix] of BLOCKED_V4)
    blockList.addSubnet(addr, prefix, 'ipv4');
for (const [addr, prefix] of BLOCKED_V6)
    blockList.addSubnet(addr, prefix, 'ipv6');

export const httpAgent = new http.Agent({
    maxSockets: CONFIG.maxSockets,
    maxTotalSockets: CONFIG.maxSockets
});
export const httpsAgent = new https.Agent({
    maxSockets: CONFIG.maxSockets,
    maxTotalSockets: CONFIG.maxSockets
});

export function isBlockedAddress(address: string, family: number): boolean {
    if (typeof address !== 'string' || address.length === 0) return true;

    const v = net.isIP(address);
    const type = v === 4 ? 'ipv4' : v === 6 ? 'ipv6' : null;

    if (!type) return true;

    if (family !== v) return true;

    return blockList.check(address, type);
}

type ResolvedAddress = { address: string; family: number };

export type LookupFn = (
    hostname: string,
    options: dns.LookupAllOptions,
    callback: (
        err: NodeJS.ErrnoException | null,
        addresses: ResolvedAddress[] | string,
        family?: number
    ) => void
) => void;

export const ssrfSafeLookup: LookupFn = (hostname, options, callback) => {
    dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
        if (err) return callback(err, '', 0);
        for (const entry of addresses) {
            if (isBlockedAddress(entry.address, entry.family)) {
                const blocked: NodeJS.ErrnoException = Object.assign(
                    new Error(`Blocked SSRF target: ${entry.address}`),
                    { code: 'ESSRFBLOCKED' }
                );
                return callback(blocked, '', 0);
            }
        }
        callback(null, addresses);
    });
};

export interface SafeResponse {
    status: number;
    statusText: string;
    location: string | null;
}

export function assertSchemeAndPortAllowed(
    url: URL,
    allowedPorts: ReadonlySet<number>
): { isHttps: boolean; port: number } {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`Unsupported protocol: ${url.protocol}`);
    }
    const isHttps = url.protocol === 'https:';
    const port = url.port === '' ? (isHttps ? 443 : 80) : Number(url.port);
    if (!allowedPorts.has(port)) {
        throw new Error(`Port not allowed: ${port}`);
    }
    return { isHttps, port };
}

export async function safeRequest(
    rawUrl: string,
    options: {
        method?: string;
        lookup?: LookupFn;
        timeoutMs?: number;
        allowedPorts?: ReadonlySet<number>;
        signal?: AbortSignal;
        isBlocked?: (address: string, family: number) => boolean;
    } = {}
): Promise<SafeResponse> {
    const {
        method = 'GET',
        lookup = ssrfSafeLookup,
        timeoutMs = CONFIG.timeoutMs,
        allowedPorts = CONFIG.allowedPorts,
        signal,
        isBlocked = isBlockedAddress
    } = options;

    const url = new URL(rawUrl);
    const { isHttps, port } = assertSchemeAndPortAllowed(url, allowedPorts);

    const transport = isHttps ? https : http;
    const hostname = url.hostname.replace(/^\[|\]$/g, '');

    const resolved = await new Promise<ResolvedAddress>((resolve, reject) => {
        if (signal?.aborted)
            return reject(new Error('Aborted before resolution'));

        const onAbort = () => reject(new Error('Aborted during resolution'));
        signal?.addEventListener('abort', onAbort, { once: true });
        lookup(hostname, { all: true }, (err, addresses) => {
            signal?.removeEventListener('abort', onAbort);
            if (err) return reject(err);
            const list = Array.isArray(addresses)
                ? addresses
                : [
                      {
                          address: addresses,
                          family: net.isIP(addresses)
                      }
                  ];
            const first = list[0];
            if (!first) return reject(new Error('No address resolved'));
            resolve(first);
        });
    });

    if (isBlocked(resolved.address, resolved.family)) {
        throw Object.assign(new Error('Blocked SSRF target'), {
            code: 'ESSRFBLOCKED'
        });
    }

    return new Promise<SafeResponse>((resolve, reject) => {
        if (signal?.aborted) {
            return reject(new Error('Aborted before request'));
        }

        const onAbort = () => {
            const err = new Error('Aborted while waiting for a socket');
            req.destroy(err);
            reject(err);
        };
        const cleanup = () => signal?.removeEventListener('abort', onAbort);

        const req = transport.request(
            {
                method,
                agent: isHttps ? httpsAgent : httpAgent,
                protocol: url.protocol,
                host: resolved.address,
                family: resolved.family,
                port,
                path: `${url.pathname}${url.search}`,
                headers: {
                    host: url.host,
                    'user-agent': CONFIG.userAgent,
                    accept: '*/*'
                },
                servername: isHttps ? hostname : undefined,
                signal
            },
            (res) => {
                const result: SafeResponse = {
                    status: res.statusCode ?? 0,
                    statusText: res.statusMessage ?? '',
                    location: res.headers.location ?? null
                };

                res.destroy();
                cleanup();
                resolve(result);
            }
        );
        signal?.addEventListener('abort', onAbort, { once: true });
        req.setTimeout(timeoutMs, () => {
            req.destroy(new Error('Request timed out'));
        });
        req.on('error', (err) => {
            cleanup();
            reject(err);
        });
        req.end();
    });
}
