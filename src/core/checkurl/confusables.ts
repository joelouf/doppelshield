import { CONFUSABLES } from './data/confusablesData';

export interface GlyphEvidence {
    char: string;
    codepoint: string;
    script: string;
    imitates: string | null;
}

export const SCRIPT_TABLE: ReadonlyArray<{ name: string; re: RegExp }> = [
    { name: 'Latin', re: /\p{Script=Latin}/u },
    { name: 'Cyrillic', re: /\p{Script=Cyrillic}/u },
    { name: 'Greek', re: /\p{Script=Greek}/u },
    { name: 'Armenian', re: /\p{Script=Armenian}/u },
    { name: 'Cherokee', re: /\p{Script=Cherokee}/u },
    { name: 'Coptic', re: /\p{Script=Coptic}/u },
    { name: 'Georgian', re: /\p{Script=Georgian}/u },
    { name: 'Hebrew', re: /\p{Script=Hebrew}/u },
    { name: 'Arabic', re: /\p{Script=Arabic}/u },
    { name: 'Han', re: /\p{Script=Han}/u },
    { name: 'Hiragana', re: /\p{Script=Hiragana}/u },
    { name: 'Katakana', re: /\p{Script=Katakana}/u },
    { name: 'Hangul', re: /\p{Script=Hangul}/u },
    { name: 'Thai', re: /\p{Script=Thai}/u },
    { name: 'Devanagari', re: /\p{Script=Devanagari}/u },
    { name: 'Lisu', re: /\p{Script=Lisu}/u },
    { name: 'Canadian Aboriginal', re: /\p{Script=Canadian_Aboriginal}/u },
    { name: 'Glagolitic', re: /\p{Script=Glagolitic}/u }
];

export function scriptName(char: string): string {
    for (const script of SCRIPT_TABLE) {
        if (script.re.test(char)) return script.name;
    }

    if (/\p{Nd}/u.test(char)) return 'Digit';

    return 'Unknown';
}

export function asciiSkeleton(value: string): string {
    let out = '';

    for (const ch of value.normalize('NFKC')) {
        out += CONFUSABLES.get(ch) ?? ch;
    }

    return out.normalize('NFKC');
}

export function glyphEvidence(value: string): GlyphEvidence[] {
    const seen = new Set<string>();
    const out: GlyphEvidence[] = [];

    for (const ch of value.normalize('NFC')) {
        const code = ch.codePointAt(0) ?? 0;

        if (code <= 0x7f || seen.has(ch)) continue;
        seen.add(ch);
        out.push({
            char: ch,
            codepoint: `U+${code.toString(16).toUpperCase().padStart(4, '0')}`,
            script: scriptName(ch),
            imitates: CONFUSABLES.get(ch) ?? null
        });
    }

    return out;
}
