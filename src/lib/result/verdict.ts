import type { CheckResult, HomographEvidence } from '@/core/checkurl/types';

export type Verdict = {
    tone: 'flagged' | 'caution' | 'clear' | 'indeterminate';
    label: string;
    note: string;
};

export const SEVERITY: Record<string, 'flagged' | 'caution'> = {
    homograph_target_impersonation: 'flagged',
    homograph_whole_script_confusable: 'flagged',
    homograph_mixed_script: 'caution',
    non_ascii_path: 'caution',
    https_downgrade: 'caution',
    redirect_cycle: 'caution',
    max_redirects_reached: 'caution'
};

export const INFORMATIONAL_CODES = new Set(['punycode_host']);

const DESTINATION_ONLY_CODES = new Set(['https_downgrade']);

export function verdictFor(
    result: CheckResult,
    homograph: HomographEvidence | undefined,
    glyphCount: number
): Verdict {
    const warnings = result.warnings;
    const hasHomoglyph = warnings.some((w) => SEVERITY[w.code] === 'flagged');
    const unverified = !result.finalUrl;
    const actionable = warnings.filter(
        (w) =>
            !INFORMATIONAL_CODES.has(w.code) &&
            !(unverified && DESTINATION_ONLY_CODES.has(w.code))
    );
    const isIdn = warnings.some((w) => w.code === 'punycode_host');

    if (hasHomoglyph) {
        const target = homograph?.target;
        const lead = target
            ? `Imitates ${target}`
            : 'Non-Latin characters are disguised as Latin text';
        const chars =
            glyphCount > 0
                ? ` using ${glyphCount} homoglyph${glyphCount === 1 ? '' : 's'} or confusable character${glyphCount === 1 ? '' : 's'} (Unicode UTS #39)`
                : '';
        const tail = unverified
            ? ', though the live destination could not be verified.'
            : ', consistent with an IDN homograph attack.';

        return {
            tone: 'flagged',
            label: 'FLAGGED',
            note: `${lead}${chars}${tail}`
        };
    }

    if (actionable.length > 0) {
        const n = actionable.length;

        return {
            tone: 'caution',
            label: 'REVIEW',
            note: result.error
                ? `${n} signal${n === 1 ? '' : 's'} worth reviewing. The scan received no response, so the live destination was not verified.`
                : `${n} signal${n === 1 ? '' : 's'} worth reviewing before you trust this link.`
        };
    }

    const code = result.error?.code;

    if (code === 'invalid_input') {
        return {
            tone: 'indeterminate',
            label: 'INDETERMINATE',
            note: 'This does not look like a valid web URL.'
        };
    }

    if (code === 'rate_limited') {
        return {
            tone: 'indeterminate',
            label: 'INDETERMINATE',
            note: 'Too many scans from your network in a short time. Wait a moment, then scan again.'
        };
    }

    if (code === 'unavailable') {
        return {
            tone: 'indeterminate',
            label: 'INDETERMINATE',
            note: 'The scan could not be completed. This reflects the check itself, not a finding about the URL.'
        };
    }

    if (code === 'unreachable') {
        return {
            tone: 'indeterminate',
            label: 'INDETERMINATE',
            note: 'No deception signals were found in the name, but the scan received no response, so the destination was not verified.'
        };
    }

    if (result.error) {
        return {
            tone: 'indeterminate',
            label: 'INDETERMINATE',
            note: 'The scan did not finish. No assessment was produced for this URL.'
        };
    }

    if (isIdn) {
        return {
            tone: 'clear',
            label: 'CLEAR',
            note: 'No deception signals in this internationalized domain (IDN), shown decoded above.'
        };
    }

    return {
        tone: 'clear',
        label: 'CLEAR',
        note: 'No deception signals detected.'
    };
}
