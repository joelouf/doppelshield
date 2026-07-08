import type { Warning } from '@/core/checkurl/types';
import { SEVERITY, INFORMATIONAL_CODES } from './verdict';

const FINDING_LABEL: Record<string, string> = {
    homograph_mixed_script: 'MIXED_SCRIPT',
    punycode_host: 'IDN_HOST',
    non_ascii_path: 'NON_ASCII_PATH',
    redirect_cycle: 'REDIRECT_CYCLE',
    max_redirects_reached: 'MAX_REDIRECTS'
};

export const FINDING_DETAIL: Record<string, string> = {
    homograph_target_impersonation:
        'Host uses confusable characters (look-alikes) to impersonate a known domain.',
    homograph_whole_script_confusable:
        'Host is written entirely in confusable characters (look-alikes) from a non-Latin script.',
    homograph_mixed_script: 'Host mixes characters from more than one script.',
    punycode_host:
        'Host is an internationalized domain name (IDN), decoded from its ASCII A-label.',
    non_ascii_path: 'URL path contains non-ASCII characters.',
    redirect_cycle: 'The redirect chain loops back on itself.',
    max_redirects_reached:
        'The redirect chain reached the follow limit before a final response.'
};

export function findingLabel(code: string, script?: string): string {
    if (
        code === 'homograph_target_impersonation' ||
        code === 'homograph_whole_script_confusable'
    ) {
        return script ? `HOMOGRAPH_${script.toUpperCase()}` : 'HOMOGRAPH';
    }

    return FINDING_LABEL[code] ?? code.toUpperCase();
}

export function findingTone(code: string): 'danger' | 'caution' | 'neutral' {
    if (INFORMATIONAL_CODES.has(code)) return 'neutral';

    return SEVERITY[code] === 'flagged' ? 'danger' : 'caution';
}

export interface Finding {
    label: string;
    tone: 'danger' | 'caution' | 'neutral';
    detail: string;
}

export function buildFindings(
    warnings: readonly Warning[],
    script?: string
): Finding[] {
    const seen = new Set<string>();
    const out: Finding[] = [];

    for (const w of warnings) {
        if (w.code === 'https_downgrade') continue;

        const label = findingLabel(w.code, script);
        const tone = findingTone(w.code);
        const detail = FINDING_DETAIL[w.code] ?? '';
        const identity = `${label}|${tone}|${detail}`;

        if (seen.has(identity)) continue;

        seen.add(identity);
        out.push({ label, tone, detail });
    }

    return out;
}
