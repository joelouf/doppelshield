import { describe, it, expect } from 'vitest';
import { nativeScriptsForTld } from '../tldScripts';

describe('nativeScriptsForTld', () => {
    it('maps a ccTLD to its native script', () => {
        expect(nativeScriptsForTld('gr')).toContain('Greek');
        expect(nativeScriptsForTld('ru')).toContain('Cyrillic');
        expect(nativeScriptsForTld('рф')).toContain('Cyrillic');
        expect(nativeScriptsForTld('am')).toContain('Armenian');
        expect(nativeScriptsForTld('ge')).toContain('Georgian');
    });
    it('covers IDN ccTLDs in their Unicode form', () => {
        expect(nativeScriptsForTld('ελ')).toContain('Greek');
    });
    it('returns empty for a generic TLD', () => {
        expect(nativeScriptsForTld('com')).toEqual([]);
        expect(nativeScriptsForTld('io')).toEqual([]);
    });
    it('returns empty for Latin-dominant vanity registries', () => {
        expect(nativeScriptsForTld('me')).toEqual([]);
        expect(nativeScriptsForTld('cy')).toEqual([]);
    });
    it('is case-insensitive', () => {
        expect(nativeScriptsForTld('GR')).toContain('Greek');
    });
});
