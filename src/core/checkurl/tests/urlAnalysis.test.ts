import { describe, it, expect } from 'vitest';
import {
    analyzeUrl,
    analyzeHost,
    dedupeWarnings,
    homographReport
} from '../urlAnalysis';

const codes = (input: string) => analyzeUrl(input).warnings.map((w) => w.code);

describe('analyzeUrl: homograph / script detection (network-free)', () => {
    it('flags a Cyrillic brand spoof as impersonation', () => {
        expect(codes('http://раypal.com/')).toContain(
            'homograph_target_impersonation'
        );
    });
    it('flags a punycode brand spoof directly', () => {
        expect(codes('http://xn--ypal-43d9g.com/')).toEqual(
            expect.arrayContaining([
                'punycode_host',
                'homograph_target_impersonation'
            ])
        );
    });
    it('flags mixed-script host (Latin + Cyrillic)', () => {
        expect(codes('http://gоstuff.example/')).toContain(
            'homograph_mixed_script'
        );
    });
    it('flags a Greek brand spoof as impersonation', () => {
        expect(codes('http://αpple.com/')).toContain(
            'homograph_target_impersonation'
        );
    });
    it('flags an Armenian brand spoof as impersonation', () => {
        expect(codes('http://gօօgle.com/')).toContain(
            'homograph_target_impersonation'
        );
    });
    it('reports a non-brand mixed-script host as review, not flagged', () => {
        expect(codes('http://Ꭰpple.com/')).toContain('homograph_mixed_script');
        expect(codes('http://Ꭰpple.com/')).not.toContain(
            'homograph_target_impersonation'
        );
    });
    it('flags non-ASCII in the path', () => {
        expect(codes('http://example.com/привет')).toContain('non_ascii_path');
    });
    it('clean ASCII URL yields no warnings', () => {
        expect(codes('http://paypal.com/login')).toEqual([]);
    });
    it('prefixes a bare host and still parses', () => {
        expect(analyzeUrl('paypal.com').url.protocol).toBe('http:');
    });
    it('throws on a non-http(s) scheme', () => {
        expect(() => analyzeUrl('ftp://example.com')).toThrow();
    });
    it('throws when the input exceeds the max length', () => {
        expect(() =>
            analyzeUrl('http://example.com/' + 'a'.repeat(5000))
        ).toThrow();
    });
    it('rejects an explicit :0 port', () => {
        expect(() => analyzeUrl('http://example.com:0/')).toThrow();
    });
    it('trims surrounding whitespace before parsing', () => {
        expect(analyzeUrl('  http://example.com/  ').url.hostname).toBe(
            'example.com'
        );
    });
    it('does not throw on a host the URL parser accepts but punycode rejects', () => {
        expect(() => analyzeUrl('http://xn---0jfc.com/')).not.toThrow();
        expect(codes('http://xn---0jfc.com/')).toContain('punycode_host');
    });
    it('rejects a non-domain host with no dot, colon, or non-ASCII', () => {
        expect(() => analyzeUrl('hello')).toThrow();
        expect(() => analyzeUrl('localhost')).toThrow();
        expect(() => analyzeUrl('asdfjkl')).toThrow();
    });
    it('accepts a bare homoglyph token even without a TLD', () => {
        expect(() => analyzeUrl('раypal')).not.toThrow();
        expect(codes('раypal')).toContain('homograph_target_impersonation');
    });
    it('accepts an IPv6 literal host', () => {
        expect(() => analyzeUrl('http://[::1]/')).not.toThrow();
    });
});

describe('analyzeHost: reusable per-host script analysis', () => {
    const hostCodes = (host: string) => analyzeHost(host).map((w) => w.code);

    it('decodes a punycode host and flags the brand impersonation', () => {
        expect(hostCodes('xn--ypal-43d9g.com')).toEqual(
            expect.arrayContaining([
                'punycode_host',
                'homograph_target_impersonation'
            ])
        );
    });
    it('returns no warnings for a plain ASCII host', () => {
        expect(analyzeHost('example.com')).toEqual([]);
    });
    it('returns no warnings for an IPv4 literal', () => {
        expect(analyzeHost('127.0.0.1')).toEqual([]);
    });
    it('strips brackets and returns no warnings for an IPv6 literal', () => {
        expect(analyzeHost('[::1]')).toEqual([]);
    });
});

describe('dedupeWarnings: collapses exact duplicates, keeps distinct details', () => {
    it('collapses warnings sharing code and detail', () => {
        const w = { code: 'punycode_host', detail: 'same' } as const;
        expect(dedupeWarnings([w, w])).toHaveLength(1);
    });
    it('keeps two homoglyph warnings that name different hosts', () => {
        const out = dedupeWarnings([
            { code: 'homograph_target_impersonation', detail: 'a.com' },
            { code: 'homograph_target_impersonation', detail: 'b.com' }
        ]);
        expect(out).toHaveLength(2);
    });
});

describe('homographReport: decoded host, skeleton, and per-glyph evidence', () => {
    it('decodes a punycode host and reveals its ASCII skeleton', () => {
        const report = homographReport('xn--ypal-43d9g.com');
        expect(report).not.toBeNull();
        expect(report?.decodedHost).toBe('раypal.com');
        expect(report?.skeleton).toBe('paypal.com');
        expect(report?.target).toBe('paypal.com');
        expect(report?.glyphs.map((g) => g.imitates)).toEqual(['p', 'a']);
    });
    it('reports evidence for a directly-typed Cyrillic host', () => {
        const report = homographReport('раypal.com');
        expect(report?.skeleton).toBe('paypal.com');
        expect(report?.target).toBe('paypal.com');
    });
    it('reports Armenian evidence with its skeleton', () => {
        const report = homographReport('gօօgle.com');
        expect(report?.skeleton).toBe('google.com');
        expect(report?.target).toBe('google.com');
        expect(report?.glyphs[0]).toMatchObject({
            script: 'Armenian',
            imitates: 'o'
        });
    });
    it('returns null for a clean ASCII host', () => {
        expect(homographReport('paypal.com')).toBeNull();
    });
});
