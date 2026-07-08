import { describe, it, expect } from 'vitest';
import {
    isBlockedAddress,
    assertSchemeAndPortAllowed,
    httpAgent,
    httpsAgent
} from '../ssrf';
import { CONFIG } from '../config';

describe('outbound agent socket caps', () => {
    it('caps sockets per destination host and in total', () => {
        expect(httpAgent.maxSockets).toBe(CONFIG.maxSockets);
        expect(httpAgent.maxTotalSockets).toBe(CONFIG.maxSockets);
        expect(httpsAgent.maxSockets).toBe(CONFIG.maxSockets);
        expect(httpsAgent.maxTotalSockets).toBe(CONFIG.maxSockets);
    });
});

describe('isBlockedAddress: IPv4', () => {
    const blocked: Array<[string, string]> = [
        ['127.0.0.1', 'loopback'],
        ['127.99.1.2', 'loopback /8'],
        ['10.0.0.1', 'private /8'],
        ['172.16.0.1', 'private /12 low'],
        ['172.31.255.255', 'private /12 high'],
        ['192.168.1.1', 'private /16'],
        ['169.254.169.254', 'link-local / cloud metadata'],
        ['0.0.0.0', 'unspecified / this-host'],
        ['100.64.0.1', 'CGNAT /10 low'],
        ['100.127.255.255', 'CGNAT /10 high'],
        ['240.0.0.1', 'Class E reserved'],
        ['255.255.255.255', 'broadcast'],
        ['224.0.0.1', 'multicast (224-239)'],
        ['239.255.255.250', 'SSDP multicast'],
        ['198.18.0.1', 'benchmarking 198.18/15'],
        ['192.0.2.1', 'TEST-NET-1'],
        ['192.88.99.1', '6to4 relay anycast']
    ];
    it.each(blocked)('blocks %s (%s)', (ip) => {
        expect(isBlockedAddress(ip, 4)).toBe(true);
    });

    const allowed: Array<[string, string]> = [
        ['8.8.8.8', 'public DNS'],
        ['1.1.1.1', 'public DNS'],
        ['93.184.216.34', 'example.com'],
        ['172.15.0.1', 'just below private /12'],
        ['172.32.0.1', 'just above private /12'],
        ['100.63.255.255', 'just below CGNAT /10'],
        ['100.128.0.0', 'just above CGNAT /10']
    ];
    it.each(allowed)('allows %s (%s)', (ip) => {
        expect(isBlockedAddress(ip, 4)).toBe(false);
    });
});

describe('isBlockedAddress: IPv6', () => {
    const blocked: Array<[string, string]> = [
        ['::1', 'loopback'],
        ['::', 'unspecified'],
        ['fc00::1', 'ULA fc00::/7'],
        ['fd12:3456:789a::1', 'ULA fd'],
        ['fe80::1', 'link-local fe80::/10 low'],
        ['febf::1', 'link-local fe80::/10 high'],
        ['fec0::1', 'site-local fec0::/10 (deprecated)'],
        ['64:ff9b::a9fe:a9fe', 'NAT64 embedding 169.254.169.254'],
        ['::ffff:127.0.0.1', 'IPv4-mapped loopback (dotted)'],
        ['::ffff:7f00:1', 'IPv4-mapped loopback (hex)'],
        ['::ffff:169.254.169.254', 'IPv4-mapped metadata (dotted)'],
        ['::ffff:a9fe:a9fe', 'IPv4-mapped metadata (hex)'],
        ['::127.0.0.1', 'IPv4-compatible loopback (deprecated)'],
        ['2002:7f00:1::', '6to4 embedding 127.0.0.1'],
        ['ff02::1', 'multicast'],
        ['2001:db8::1', 'documentation 2001:db8::/32'],
        ['2001::1', 'Teredo 2001:0::/32']
    ];
    it.each(blocked)('blocks %s (%s)', (ip) => {
        expect(isBlockedAddress(ip, 6)).toBe(true);
    });

    const allowed: Array<[string, string]> = [
        ['2606:4700:4700::1111', 'Cloudflare public'],
        ['2001:4860:4860::8888', 'Google public'],
        ['::ffff:8.8.8.8', 'IPv4-mapped PUBLIC address decodes to public']
    ];
    it.each(allowed)('allows %s (%s)', (ip) => {
        expect(isBlockedAddress(ip, 6)).toBe(false);
    });
});

describe('isBlockedAddress: fail closed on malformed / unknown', () => {
    const failClosed: Array<[string, number]> = [
        ['', 4],
        ['not-an-ip', 4],
        ['999.999.999.999', 4],
        ['10.0.0', 4],
        ['::1', 0],
        ['1.2.3.4', 0]
    ];
    it.each(failClosed)(
        'blocks malformed/unknown %j (family %i)',
        (ip, family) => {
            expect(isBlockedAddress(ip, family)).toBe(true);
        }
    );
});

describe('isBlockedAddress: family is derived from the address form, not the caller', () => {
    it('blocks a v4-mapped v6 loopback literal even when declared as ipv4', () => {
        expect(isBlockedAddress('::ffff:127.0.0.1', 4)).toBe(true);
    });

    it('blocks a v4-mapped v6 metadata literal even when declared as ipv4', () => {
        expect(isBlockedAddress('::ffff:169.254.169.254', 4)).toBe(true);
    });

    it('fails closed when a v4 literal is declared as ipv6', () => {
        expect(isBlockedAddress('127.0.0.1', 6)).toBe(true);
    });

    it('fails closed when a v6 literal is declared as ipv4', () => {
        expect(isBlockedAddress('::1', 4)).toBe(true);
    });

    it('still allows a genuine public v4 declared as family 4', () => {
        expect(isBlockedAddress('8.8.8.8', 4)).toBe(false);
    });

    it('still allows a genuine public v6 declared as family 6', () => {
        expect(isBlockedAddress('2606:4700:4700::1111', 6)).toBe(false);
    });
});

describe('assertSchemeAndPortAllowed: shared scheme/port gate', () => {
    const ports = new Set([80, 443]);

    it('permits http on the default port and returns derived scheme/port', () => {
        const r = assertSchemeAndPortAllowed(
            new URL('http://example.com/'),
            ports
        );
        expect(r).toEqual({ isHttps: false, port: 80 });
    });

    it('permits https on the default port and returns derived scheme/port', () => {
        const r = assertSchemeAndPortAllowed(
            new URL('https://example.com/'),
            ports
        );
        expect(r).toEqual({ isHttps: true, port: 443 });
    });

    it('rejects a non-http(s) scheme', () => {
        expect(() =>
            assertSchemeAndPortAllowed(new URL('ftp://example.com/'), ports)
        ).toThrow(/protocol/i);
    });

    it('rejects a port outside the allow-list', () => {
        expect(() =>
            assertSchemeAndPortAllowed(
                new URL('http://example.com:6379/'),
                ports
            )
        ).toThrow(/port/i);
    });

    it('rejects an explicit :0 port', () => {
        expect(() =>
            assertSchemeAndPortAllowed(new URL('http://example.com:0/'), ports)
        ).toThrow(/port/i);
    });
});
