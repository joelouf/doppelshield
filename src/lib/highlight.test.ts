import { describe, it, expect } from 'vitest';
import { pathNonAscii, highlightTones } from './highlight';
import type { Warning } from '@/core/checkurl/types';

const w = (code: Warning['code']): Warning => ({ code, detail: '' });

describe('pathNonAscii', () => {
    it('collects non-ASCII characters from the path', () => {
        const set = pathNonAscii('https://example.com/café');
        expect(set.has('é')).toBe(true);
        expect(set.has('c')).toBe(false);
    });

    it('handles a bare host without a scheme', () => {
        expect(pathNonAscii('example.com/naïve').has('ï')).toBe(true);
    });

    it('includes non-ASCII characters from the query string', () => {
        expect(pathNonAscii('https://example.com/?q=naïve').has('ï')).toBe(
            true
        );
    });

    it('decodes percent-encoded non-ASCII path segments', () => {
        expect(pathNonAscii('https://example.com/caf%C3%A9').has('é')).toBe(
            true
        );
    });

    it('returns an empty set for an all-ASCII path', () => {
        expect(pathNonAscii('https://example.com/about').size).toBe(0);
    });
});

describe('highlightTones', () => {
    it('tones host glyphs with the host tone', () => {
        const tones = highlightTones(
            ['р', 'а'],
            [w('homograph_target_impersonation')],
            'раypal.com',
            'danger'
        );
        expect(tones.get('р')).toBe('danger');
        expect(tones.get('а')).toBe('danger');
    });

    it('tones host glyphs caution for a mixed-script-only result', () => {
        const tones = highlightTones(
            ['д'],
            [w('homograph_mixed_script')],
            'https://exaдple.com',
            'caution'
        );
        expect(tones.get('д')).toBe('caution');
    });

    it('adds non-ASCII path characters as caution when non_ascii_path fired', () => {
        const tones = highlightTones(
            [],
            [w('non_ascii_path')],
            'https://example.com/café',
            'caution'
        );
        expect(tones.get('é')).toBe('caution');
    });

    it('does not highlight path characters when non_ascii_path did not fire', () => {
        const tones = highlightTones(
            [],
            [w('punycode_host')],
            'https://example.com/café',
            'caution'
        );
        expect(tones.has('é')).toBe(false);
    });

    it('keeps a danger host glyph even when the same char is in the path', () => {
        const tones = highlightTones(
            ['а'],
            [w('homograph_target_impersonation'), w('non_ascii_path')],
            'https://раypal.com/а',
            'danger'
        );
        expect(tones.get('а')).toBe('danger');
    });
});
