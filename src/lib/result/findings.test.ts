import { describe, it, expect } from 'vitest';
import type { Warning } from '@/core/checkurl/types';
import { analyzeHost, dedupeWarnings } from '@/core/checkurl/urlAnalysis';
import { buildFindings } from './findings';

describe('buildFindings', () => {
    it('renders each finding type once when a redirect chain raises the same code per host', () => {
        const warnings = dedupeWarnings([
            ...analyzeHost('xn--80ak6aa92e.com'),
            ...analyzeHost('xn--80ak6aa92e.com'),
            ...analyzeHost('www.xn--80ak6aa92e.com')
        ]);
        expect(warnings.length).toBeGreaterThan(2);

        const findings = buildFindings(warnings, 'Cyrillic');
        expect(findings.map((f) => f.label)).toEqual([
            'IDN_HOST',
            'HOMOGRAPH_CYRILLIC'
        ]);

        const identities = findings.map(
            (f) => `${f.label}|${f.tone}|${f.detail}`
        );
        expect(new Set(identities).size).toBe(findings.length);
    });

    it('excludes https_downgrade, which the redirect chain surfaces instead', () => {
        const warnings: Warning[] = [
            { code: 'punycode_host', detail: 'a' },
            { code: 'https_downgrade', detail: 'b' }
        ];
        expect(buildFindings(warnings).map((f) => f.label)).toEqual([
            'IDN_HOST'
        ]);
    });

    it('keeps genuinely distinct finding types', () => {
        const warnings: Warning[] = [
            { code: 'punycode_host', detail: 'x' },
            { code: 'non_ascii_path', detail: 'y' }
        ];
        expect(buildFindings(warnings).map((f) => f.label)).toEqual([
            'IDN_HOST',
            'NON_ASCII_PATH'
        ]);
    });
});
