export type WarningCode =
    | 'homograph_target_impersonation'
    | 'homograph_whole_script_confusable'
    | 'homograph_mixed_script'
    | 'punycode_host'
    | 'non_ascii_path'
    | 'https_downgrade'
    | 'redirect_cycle'
    | 'max_redirects_reached';

export interface Warning {
    code: WarningCode;
    detail: string;
}

export type { GlyphEvidence } from './confusables';

export interface HomographEvidence {
    decodedHost: string;
    asciiHost?: string;
    skeleton: string;
    glyphs: import('./confusables').GlyphEvidence[];
    target: string | null;
}

export interface RedirectHop {
    url: string;
    status: number;
}

export interface CheckResult {
    apiVersion: 1;
    ok: boolean;
    finalUrl?: string;
    status?: number;
    redirectChain?: RedirectHop[];
    warnings: Warning[];
    homograph?: HomographEvidence;
    error?: {
        code:
            | 'invalid_input'
            | 'unreachable'
            | 'rate_limited'
            | 'unavailable'
            | 'method_not_allowed';
        message: string;
    };
}
