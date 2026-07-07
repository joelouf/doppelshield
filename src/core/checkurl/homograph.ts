import punycode from 'punycode/';
import { asciiSkeleton, glyphEvidence, SCRIPT_TABLE } from './confusables';
import { matchTarget } from './targets';
import { nativeScriptsForTld } from './tldScripts';
import type { HomographEvidence, Warning } from './types';

function scriptOfChar(ch: string): string {
    for (const s of SCRIPT_TABLE) if (s.re.test(ch)) return s.name;
    return 'Other';
}

export function scriptsOf(label: string): Set<string> {
    const out = new Set<string>();
    for (const ch of label) {
        if (!/\p{L}/u.test(ch)) continue;
        out.add(scriptOfChar(ch));
    }
    return out;
}

const JAPANESE = new Set(['Han', 'Hiragana', 'Katakana']);
const KOREAN = new Set(['Han', 'Hangul']);

function isMixedScript(scripts: Set<string>): boolean {
    if (scripts.size <= 1) return false;
    const within = (allowed: Set<string>) =>
        [...scripts].every((name) => allowed.has(name));

    if (within(JAPANESE) || within(KOREAN)) return false;
    return true;
}

// A malformed A-label must not abort analysis.
// Fall back to the raw host so a crafted xn-- string cannot suppress the remaining checks.
function safeToUnicode(host: string): string {
    try {
        return punycode.toUnicode(host);
    } catch {
        return host;
    }
}

const ASCII_LDH = /^[a-z0-9-]+$/;
const HAS_ALPHA = /[a-z]/;

export function analyzeHomograph(hostname: string): {
    warnings: Warning[];
    evidence: HomographEvidence | null;
} {
    const ascii = hostname.replace(/^\[|\]$/g, '');
    const isPuny = ascii.startsWith('xn--') || ascii.includes('.xn--');
    const decoded = isPuny ? safeToUnicode(ascii) : ascii;
    const warnings: Warning[] = [];

    if (isPuny) {
        warnings.push({
            code: 'punycode_host',
            detail: `Internationalized domain name (IDN); A-label decodes to ${decoded}`
        });
    }

    const target = matchTarget(decoded);
    const labels = decoded.replace(/\.$/, '').split('.');
    const tldIndex = labels.length - 1;
    const nativeScripts = nativeScriptsForTld(labels[tldIndex] ?? '');
    const registrableLabelIndex = labels.length - 2;
    let wholeScript = false;
    let mixed = false;
    for (const [i, label] of labels.entries()) {
        const scripts = scriptsOf(label);
        if (isMixedScript(scripts)) mixed = true;
        const nonLatin = [...scripts].filter(
            (s) => s !== 'Latin' && s !== 'Other'
        );
        const skeleton = asciiSkeleton(label);
        const soleNonLatin = nonLatin.length === 1 ? nonLatin[0] : undefined;
        const nativeExempt =
            i === registrableLabelIndex &&
            soleNonLatin !== undefined &&
            nativeScripts.includes(soleNonLatin);
        if (
            scripts.size === 1 &&
            nonLatin.length === 1 &&
            ASCII_LDH.test(skeleton) &&
            HAS_ALPHA.test(skeleton) &&
            skeleton.length >= 2 &&
            skeleton !== label &&
            !nativeExempt
        ) {
            wholeScript = true;
        }
    }

    if (target) {
        warnings.push({
            code: 'homograph_target_impersonation',
            detail: `Host is confusable with ${target}: ${decoded}`
        });
    } else if (wholeScript) {
        warnings.push({
            code: 'homograph_whole_script_confusable',
            detail: `Non-Latin host reads as Latin text: ${decoded}`
        });
    } else if (mixed) {
        warnings.push({
            code: 'homograph_mixed_script',
            detail: `Host mixes multiple scripts: ${decoded}`
        });
    }

    const glyphs = glyphEvidence(decoded);
    const evidence =
        glyphs.length > 0
            ? {
                  decodedHost: decoded,
                  asciiHost: ascii,
                  skeleton: asciiSkeleton(decoded),
                  glyphs,
                  target
              }
            : null;

    return { warnings, evidence };
}
