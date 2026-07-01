import { describe, it, expect } from 'vitest';
import { hasScheme, toParseableUrl } from './url';

describe('hasScheme', () => {
    it('detects an http scheme', () => {
        expect(hasScheme('http://example.com')).toBe(true);
    });

    it('detects an https scheme regardless of case', () => {
        expect(hasScheme('HTTPS://example.com')).toBe(true);
    });

    it('detects a non-web scheme so callers can still recognize it', () => {
        expect(hasScheme('ftp://example.com')).toBe(true);
        expect(hasScheme('mailto://x')).toBe(true);
    });

    it('reports no scheme for a bare host', () => {
        expect(hasScheme('example.com')).toBe(false);
        expect(hasScheme('example.com/path')).toBe(false);
    });

    it('reports no scheme for a host that merely contains a colon port', () => {
        expect(hasScheme('example.com:8080')).toBe(false);
    });

    it('reports no scheme for empty input', () => {
        expect(hasScheme('')).toBe(false);
    });
});

describe('toParseableUrl', () => {
    it('leaves a scheme-bearing input untouched', () => {
        expect(toParseableUrl('https://example.com/x')).toBe(
            'https://example.com/x'
        );
    });

    it('prepends https when no scheme is present', () => {
        expect(toParseableUrl('example.com/x')).toBe('https://example.com/x');
    });

    it('does not invent a scheme for a non-web scheme input', () => {
        expect(toParseableUrl('ftp://example.com')).toBe('ftp://example.com');
    });

    it('produces a value that parses as a URL with the entered host', () => {
        expect(new URL(toParseableUrl('example.com/x')).hostname).toBe(
            'example.com'
        );
    });
});
