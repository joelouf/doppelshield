import { describe, it, expect } from 'vitest';
import { verdictFor } from './verdict';
import type {
    CheckResult,
    HomographEvidence,
    Warning
} from '@/core/checkurl/types';

const w = (code: Warning['code']): Warning => ({ code, detail: '' });

const reachable = (warnings: Warning[]): CheckResult => ({
    apiVersion: 1,
    ok: true,
    finalUrl: 'https://example.com/',
    status: 200,
    redirectChain: [{ url: 'https://example.com/', status: 200 }],
    warnings
});

const errored = (
    code: NonNullable<CheckResult['error']>['code'],
    warnings: Warning[] = []
): CheckResult => ({
    apiVersion: 1,
    ok: false,
    warnings,
    error: { code, message: 'x' }
});

const paypalTarget: HomographEvidence = {
    decodedHost: 'раypal.com',
    asciiHost: 'xn--ypal-43d9g.com',
    skeleton: 'paypal.com',
    glyphs: [],
    target: 'paypal.com'
};

describe('verdictFor:IDN is informational, not a signal', () => {
    it('returns CLEAR for a bare IDN that resolves (münchen.com, пример.рф)', () => {
        const v = verdictFor(reachable([w('punycode_host')]), undefined, 0);
        expect(v.tone).toBe('clear');
        expect(v.label).toBe('CLEAR');
        expect(v.note).toContain('internationalized domain (IDN)');
    });

    it('does NOT elevate a bare IDN to REVIEW just for being an IDN', () => {
        const v = verdictFor(reachable([w('punycode_host')]), undefined, 0);
        expect(v.label).not.toBe('REVIEW');
    });

    it('an unreachable bare IDN is INDETERMINATE (unreachable), not REVIEW', () => {
        const v = verdictFor(
            errored('unreachable', [w('punycode_host')]),
            undefined,
            0
        );
        expect(v.tone).toBe('indeterminate');
        expect(v.label).toBe('INDETERMINATE');
    });

    it('keeps a plain (non-IDN) clean result CLEAR with the generic note', () => {
        const v = verdictFor(reachable([]), undefined, 0);
        expect(v.label).toBe('CLEAR');
        expect(v.note).not.toContain('IDN');
    });
});

describe('verdictFor:real signals still elevate', () => {
    it('IDN + mixed-script is REVIEW, counting only the actionable signal', () => {
        const v = verdictFor(
            reachable([w('punycode_host'), w('homograph_mixed_script')]),
            undefined,
            0
        );
        expect(v.label).toBe('REVIEW');
        expect(v.note).toContain('1 signal worth reviewing');
    });

    it('counts multiple actionable signals but never the IDN one', () => {
        const v = verdictFor(
            reachable([
                w('punycode_host'),
                w('homograph_mixed_script'),
                w('https_downgrade')
            ]),
            undefined,
            0
        );
        expect(v.label).toBe('REVIEW');
        expect(v.note).toContain('2 signals worth reviewing');
    });

    it('does NOT cite https_downgrade on an unreached host (no rendered evidence)', () => {
        const v = verdictFor(
            errored('unreachable', [w('https_downgrade')]),
            undefined,
            0
        );
        expect(v.label).not.toBe('REVIEW');
        expect(v.label).toBe('INDETERMINATE');
    });

    it('IDN + target impersonation is FLAGGED with the target and glyph count', () => {
        const v = verdictFor(
            reachable([
                w('punycode_host'),
                w('homograph_target_impersonation')
            ]),
            paypalTarget,
            2
        );
        expect(v.tone).toBe('flagged');
        expect(v.label).toBe('FLAGGED');
        expect(v.note).toContain('Imitates paypal.com');
        expect(v.note).toContain('2 homoglyphs or confusable characters');
        expect(v.note).toContain('consistent with an IDN homograph attack');
    });

    it('whole-script confusable with no known target is still FLAGGED', () => {
        const v = verdictFor(
            reachable([
                w('punycode_host'),
                w('homograph_whole_script_confusable')
            ]),
            undefined,
            5
        );
        expect(v.label).toBe('FLAGGED');
        expect(v.note).toContain('Non-Latin characters are disguised');
    });

    it('a flagged homograph on an unreachable host notes the unverified destination', () => {
        const v = verdictFor(
            errored('unreachable', [
                w('punycode_host'),
                w('homograph_target_impersonation')
            ]),
            paypalTarget,
            2
        );
        expect(v.label).toBe('FLAGGED');
        expect(v.note).toContain('the live destination could not be verified');
    });
});

describe('verdictFor:scan-level errors stay INDETERMINATE', () => {
    it('invalid_input', () => {
        expect(verdictFor(errored('invalid_input'), undefined, 0).label).toBe(
            'INDETERMINATE'
        );
    });
    it('rate_limited', () => {
        expect(verdictFor(errored('rate_limited'), undefined, 0).label).toBe(
            'INDETERMINATE'
        );
    });
    it('unavailable', () => {
        expect(verdictFor(errored('unavailable'), undefined, 0).label).toBe(
            'INDETERMINATE'
        );
    });
});
