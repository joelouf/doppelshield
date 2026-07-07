import { describe, it, expect } from 'vitest';
import { analyzeHomograph, scriptsOf } from '../homograph';

const codes = (host: string) =>
    analyzeHomograph(host).warnings.map((w) => w.code);

describe('scriptsOf', () => {
    it('reports the distinct scripts of the letters in a label', () => {
        expect([...scriptsOf('paypal')]).toEqual(['Latin']);
        expect([...scriptsOf('раypal')].sort()).toEqual(['Cyrillic', 'Latin']);
        expect([...scriptsOf('аррӏе')]).toEqual(['Cyrillic']);
    });
});

describe('analyzeHomograph: brand impersonation (exact skeleton collision)', () => {
    it('flags a whole-domain Cyrillic spoof of a known brand', () => {
        const r = analyzeHomograph('аррӏе.com');
        expect(r.warnings.map((w) => w.code)).toContain(
            'homograph_target_impersonation'
        );
        expect(r.evidence?.target).toBe('apple.com');
        expect(r.evidence?.skeleton).toBe('apple.com');
    });
    it('flags a punycode spoof of a known brand', () => {
        const r = analyzeHomograph('xn--ypal-43d9g.com');
        expect(r.warnings.map((w) => w.code)).toContain(
            'homograph_target_impersonation'
        );
        expect(r.evidence?.target).toBe('paypal.com');
    });
    it('emits only the impersonation code, not a redundant mixed-script (strict precedence)', () => {
        const c = analyzeHomograph('раypal.com').warnings.map((w) => w.code);
        expect(c).toContain('homograph_target_impersonation');
        expect(c).not.toContain('homograph_mixed_script');
    });
});

describe('analyzeHomograph: whole-script confusable (no brand)', () => {
    it('flags an all-Cyrillic label that reads as Latin but is not a brand', () => {
        expect(codes('ѕсоре.com')).toContain(
            'homograph_whole_script_confusable'
        );
    });
    it('flags a non-Latin label that reads as Latin under a foreign TLD', () => {
        expect(codes('ναι.com')).toContain('homograph_whole_script_confusable');
    });
});

describe('analyzeHomograph: discipline (no false positives)', () => {
    it('does not flag a genuine single-script IDN that does not read as Latin', () => {
        expect(codes('δοκιμή.gr')).not.toContain(
            'homograph_target_impersonation'
        );
        expect(codes('δοκιμή.gr')).not.toContain(
            'homograph_whole_script_confusable'
        );
    });
    it('does not flag a Latin-reducible IDN whose script is native to its ccTLD', () => {
        expect(codes('ναι.gr')).not.toContain(
            'homograph_whole_script_confusable'
        );
    });
    it('does not flag a single-character non-Latin host', () => {
        expect(codes('а.com')).not.toContain(
            'homograph_whole_script_confusable'
        );
    });
    it('does not flag the genuine brand domain', () => {
        expect(codes('apple.com')).toEqual([]);
    });
    it('reports a plain ASCII host as clean', () => {
        expect(codes('github.com')).toEqual([]);
        expect(analyzeHomograph('github.com').evidence).toBeNull();
    });
});

describe('analyzeHomograph: mixed script is review, not flagged', () => {
    it('reports mixed-script for a Latin+non-Latin host with no brand collision', () => {
        const c = codes('Ꭰpple.com');
        expect(c).toContain('homograph_mixed_script');
        expect(c).not.toContain('homograph_target_impersonation');
        expect(c).not.toContain('homograph_whole_script_confusable');
    });
});

describe('analyzeHomograph: legitimate CJK is not mixed-script', () => {
    it('does not flag a Japanese kanji+kana label', () => {
        expect(codes('東京の.com')).not.toContain('homograph_mixed_script');
    });
    it('does not flag a Korean Han+Hangul label', () => {
        expect(codes('韓國어.com')).not.toContain('homograph_mixed_script');
    });
    it('still flags an unrelated multi-script label', () => {
        expect(codes('Ꭰpple.com')).toContain('homograph_mixed_script');
    });
});

describe('analyzeHomograph: TLD/script coherence boundary', () => {
    it('exempts a Latin-reducible Cyrillic label under a Cyrillic ccTLD', () => {
        expect(codes('ѕсоре.рф')).not.toContain(
            'homograph_whole_script_confusable'
        );
    });
    it('exempts a Greek label under the Greek IDN ccTLD', () => {
        expect(codes('ναι.ελ')).not.toContain(
            'homograph_whole_script_confusable'
        );
    });
    it('flags a Cyrillic Latin-reading label under a Latin-dominant vanity TLD', () => {
        expect(codes('ѕсоре.me')).toContain(
            'homograph_whole_script_confusable'
        );
    });
});

describe('analyzeHomograph: L-1 digit/hyphen do not escape whole-script detection', () => {
    it('flags an all-Cyrillic label whose skeleton ends in a digit', () => {
        expect(codes('ѕсоре1.com')).toContain(
            'homograph_whole_script_confusable'
        );
    });
    it('flags an all-Cyrillic label whose skeleton contains a hyphen', () => {
        expect(codes('ѕс-оре.com')).toContain(
            'homograph_whole_script_confusable'
        );
    });
    it('does not flag plain ASCII that merely contains a digit', () => {
        expect(codes('scope1.com')).not.toContain(
            'homograph_whole_script_confusable'
        );
    });
    it('does not flag a non-Latin label that folds to digits only', () => {
        expect(codes('１２３.com')).not.toContain(
            'homograph_whole_script_confusable'
        );
    });
});

describe('analyzeHomograph: L-3 trailing-dot FQDN', () => {
    it('does not treat a root-qualified IDN as a false positive', () => {
        expect(codes('ѕсоре.рф.')).not.toContain(
            'homograph_whole_script_confusable'
        );
    });
});

describe('analyzeHomograph: L-2 native-TLD exemption is registrable-scoped', () => {
    it('still flags a confusable subdomain under a native-script ccTLD', () => {
        expect(codes('ѕсоре.example.рф')).toContain(
            'homograph_whole_script_confusable'
        );
    });
    it('still exempts the registrable-domain label itself under its ccTLD', () => {
        expect(codes('ѕсоре.рф')).not.toContain(
            'homograph_whole_script_confusable'
        );
    });
});
