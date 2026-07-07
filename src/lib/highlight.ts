import type { Warning } from '@/core/checkurl/types';
import { toParseableUrl } from './url';

export type HighlightTone = 'danger' | 'caution';

export function pathNonAscii(input: string): Set<string> {
    const out = new Set<string>();
    try {
        const parsed = new URL(toParseableUrl(input));
        let decoded: string;

        try {
            decoded = decodeURIComponent(parsed.pathname + parsed.search);
        } catch {
            decoded = parsed.pathname + parsed.search;
        }

        for (const ch of decoded) {
            if ((ch.codePointAt(0) ?? 0) > 0x7f) out.add(ch);
        }
    } catch {
        return out;
    }

    return out;
}

export function highlightTones(
    glyphChars: readonly string[],
    warnings: readonly Warning[],
    enteredUrl: string,
    hostTone: HighlightTone
): Map<string, HighlightTone> {
    const tones = new Map<string, HighlightTone>();

    for (const ch of glyphChars) tones.set(ch, hostTone);

    if (warnings.some((w) => w.code === 'non_ascii_path')) {
        for (const ch of pathNonAscii(enteredUrl)) {
            if (!tones.has(ch)) tones.set(ch, 'caution');
        }
    }
    return tones;
}
