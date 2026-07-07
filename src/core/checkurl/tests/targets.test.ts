import { describe, it, expect } from 'vitest';
import { matchTarget } from '../targets';

describe('matchTarget', () => {
    it('matches a Cyrillic look-alike of a known brand', () => {
        expect(matchTarget('аррӏе.com')).toBe('apple.com');
    });
    it('matches a brand spoof on a subdomained host', () => {
        expect(matchTarget('secure.раypal.com')).toBe('paypal.com');
    });
    it('matches a brand spoof under a multi-part public suffix', () => {
        expect(matchTarget('аррӏе.co.uk')).toBe('apple.com');
    });
    it('matches a brand carried only by the popularity list, not the seed', () => {
        expect(matchTarget('mcdonаlds.com')).toBe('mcdonalds.com');
    });
    it('does not match the genuine brand domain itself', () => {
        expect(matchTarget('apple.com')).toBeNull();
        expect(matchTarget('paypal.com')).toBeNull();
    });
    it('does not match a genuine brand used as a plain ASCII subdomain', () => {
        expect(matchTarget('paypal.example.com')).toBeNull();
    });
    it('does not match an unrelated host', () => {
        expect(matchTarget('example.com')).toBeNull();
    });
    it('does not match a genuine popularity-list brand domain', () => {
        expect(matchTarget('mcdonalds.com')).toBeNull();
    });
    it('does not match a legitimate Latin IDN with no cross-script confusable', () => {
        expect(matchTarget('münchen.com')).toBeNull();
    });
    it('does not match an ASCII typosquat (not a homoglyph)', () => {
        expect(matchTarget('appie.com')).toBeNull();
    });
    it('does not match IP literals', () => {
        expect(matchTarget('127.0.0.1')).toBeNull();
        expect(matchTarget('[::1]')).toBeNull();
    });
});
