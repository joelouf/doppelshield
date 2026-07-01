import { describe, it, expect } from 'vitest';
import { splitUrl, clampHost } from './urlDisplay';

describe('splitUrl', () => {
    it('decomposes a full https URL', () => {
        expect(splitUrl('https://example.com/a/b?q=1#f')).toEqual({
            ok: true,
            scheme: 'https://',
            userinfo: '',
            host: 'example.com',
            port: '',
            rest: '/a/b?q=1#f'
        });
    });

    it('treats schemeless input as schemeless without inventing a scheme', () => {
        expect(splitUrl('example.com/path')).toEqual({
            ok: true,
            scheme: '',
            userinfo: '',
            host: 'example.com',
            port: '',
            rest: '/path'
        });
    });

    it('renders a bare host with empty rest', () => {
        expect(splitUrl('xn--ypal-43d9g.com')).toEqual({
            ok: true,
            scheme: '',
            userinfo: '',
            host: 'xn--ypal-43d9g.com',
            port: '',
            rest: ''
        });
    });

    it('preserves a decoded Unicode host without re-encoding to punycode', () => {
        expect(splitUrl('раypal.com').host).toBe('раypal.com');
    });

    it('separates userinfo from the real host (the @ trick)', () => {
        expect(splitUrl('https://paypal.com@evil.com/x')).toEqual({
            ok: true,
            scheme: 'https://',
            userinfo: 'paypal.com@',
            host: 'evil.com',
            port: '',
            rest: '/x'
        });
    });

    it('uses the last @ so a multi-@ authority resolves to the real host', () => {
        expect(splitUrl('https://a@b@host.com/x')).toMatchObject({
            host: 'host.com'
        });
    });

    it('treats a backslash in the authority as a separator (matches the parser)', () => {
        expect(splitUrl('https://evil.com\\@paypal.com')).toMatchObject({
            host: 'evil.com'
        });
    });

    it('does not let a backslash glue a fake label onto the host', () => {
        expect(splitUrl('https://good.com\\.evil.com/')).toMatchObject({
            host: 'good.com'
        });
    });

    it('keeps a non default port and omits default ports', () => {
        expect(splitUrl('https://h.com:8443/').port).toBe(':8443');
        expect(splitUrl('https://h.com:443/').port).toBe('');
        expect(splitUrl('http://h.com:80/').port).toBe('');
    });

    it('handles an IPv6 literal with port', () => {
        expect(splitUrl('http://[::1]:8080/p')).toMatchObject({
            host: '[::1]',
            port: ':8080',
            rest: '/p'
        });
    });

    it('returns ok false for empty input', () => {
        expect(splitUrl('').ok).toBe(false);
    });

    it('returns ok false for a scheme with no host', () => {
        expect(splitUrl('http://').ok).toBe(false);
    });

    it('returns ok false for a non http or https scheme', () => {
        expect(splitUrl('ftp://h.com/x').ok).toBe(false);
    });
});

describe('clampHost', () => {
    it('leaves a normal host unchanged', () => {
        expect(clampHost('раypal.com', 48)).toEqual({
            head: 'раypal.com',
            tail: '',
            hiddenCount: 0
        });
    });

    it('middle elides a padded multi subdomain host keeping the rightmost labels', () => {
        const host = `${'sub.'.repeat(20)}evil.co.uk`;
        const out = clampHost(host, 48);
        expect(out.tail).toBe('evil.co.uk');
        expect(out.hiddenCount).toBeGreaterThan(0);
        expect(out.head.length).toBeGreaterThan(0);
        expect(out.head.length + out.tail.length + out.hiddenCount).toBe(
            host.length
        );
    });
});
