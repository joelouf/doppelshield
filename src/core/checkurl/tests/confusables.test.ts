import { describe, it, expect } from 'vitest';
import { asciiSkeleton, glyphEvidence, scriptName } from '../confusables';

describe('asciiSkeleton', () => {
    it('reduces a Cyrillic look-alike host to its ASCII skeleton', () => {
        expect(asciiSkeleton('paypal.com')).toBe('paypal.com');
        expect(asciiSkeleton('раypal.com')).toBe('paypal.com');
    });
    it('reduces a Greek look-alike to ASCII', () => {
        expect(asciiSkeleton('αpple.com')).toBe('apple.com');
    });
    it('reduces an Armenian look-alike to ASCII', () => {
        expect(asciiSkeleton('gօօgle.com')).toBe('google.com');
    });
    it('reduces a Cherokee look-alike to ASCII', () => {
        expect(asciiSkeleton('Ꭰpple.com')).toBe('dpple.com');
    });
    it('leaves a plain ASCII host unchanged', () => {
        expect(asciiSkeleton('github.com')).toBe('github.com');
    });
    it('folds fullwidth compatibility look-alikes to ASCII (L-4)', () => {
        expect(asciiSkeleton('ｐａｙｐａｌ.com')).toBe('paypal.com');
    });
    it('folds a compatibility ligature to its ASCII letters (L-4)', () => {
        expect(asciiSkeleton('ﬁle.com')).toBe('file.com');
    });
    it('does not reduce a diacritic letter to its base (UTS-39)', () => {
        expect(asciiSkeleton('café.com')).toBe('café.com');
    });
});

describe('scriptName', () => {
    it('names Cyrillic and Greek code points', () => {
        expect(scriptName('а')).toBe('Cyrillic');
        expect(scriptName('ο')).toBe('Greek');
    });
    it('uses the single canonical name for Canadian Aboriginal syllabics', () => {
        expect(scriptName('ᐁ')).toBe('Canadian Aboriginal');
    });
});

describe('glyphEvidence', () => {
    it('reports each non-ASCII glyph with codepoint, script, and imitated letter', () => {
        const ev = glyphEvidence('раypal.com');
        expect(ev).toEqual([
            {
                char: 'р',
                codepoint: 'U+0440',
                script: 'Cyrillic',
                imitates: 'p'
            },
            {
                char: 'а',
                codepoint: 'U+0430',
                script: 'Cyrillic',
                imitates: 'a'
            }
        ]);
    });
    it('maps a Greek glyph to its Latin prototype', () => {
        expect(glyphEvidence('αpple.com')).toEqual([
            { char: 'α', codepoint: 'U+03B1', script: 'Greek', imitates: 'a' }
        ]);
    });
    it('maps an Armenian glyph to its Latin prototype', () => {
        expect(glyphEvidence('gօօgle.com')).toEqual([
            {
                char: 'օ',
                codepoint: 'U+0585',
                script: 'Armenian',
                imitates: 'o'
            }
        ]);
    });
    it('deduplicates repeated glyphs and ignores ASCII', () => {
        expect(glyphEvidence('aaa.com')).toEqual([]);
    });
});
