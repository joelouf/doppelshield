import { CONFIG } from './config';
import { analyzeHomograph } from './homograph';
import type { Warning } from './types';

export interface UrlAnalysis {
    url: URL;
    warnings: Warning[];
}

function prefixUrl(input: string): string {
    const trimmed = input.trim();
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
        ? trimmed
        : `http://${trimmed}`;
}

const NON_ASCII = /[^ -~]/;

function safeDecode(s: string): string {
    try {
        return decodeURIComponent(s);
    } catch {
        return s;
    }
}

export function analyzeHost(hostname: string): Warning[] {
    return analyzeHomograph(hostname).warnings;
}

export function homographReport(hostname: string) {
    return analyzeHomograph(hostname).evidence;
}

export function dedupeWarnings(warnings: Warning[]): Warning[] {
    const seen = new Set<string>();
    const out: Warning[] = [];

    for (const w of warnings) {
        const key = `${w.code}|${w.detail}`;

        if (seen.has(key)) continue;

        seen.add(key);
        out.push(w);
    }

    return out;
}

export function analyzeUrl(rawInput: string): UrlAnalysis {
    const prepared = prefixUrl(rawInput);

    if (prepared.length > CONFIG.maxUrlLength) throw new Error('URL too long');

    const url = new URL(prepared);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Only HTTP(S) URLs are allowed');
    }

    const defaultPort = url.protocol === 'https:' ? 443 : 80;
    const port = url.port === '' ? defaultPort : Number(url.port);

    if (!CONFIG.allowedPorts.has(port)) throw new Error('Port not allowed');

    const asciiHost = url.hostname.replace(/^\[|\]$/g, '');
    const isPunycode =
        asciiHost.startsWith('xn--') || asciiHost.includes('.xn--');

    if (!asciiHost.includes('.') && !asciiHost.includes(':') && !isPunycode) {
        throw new Error('Host is not a domain');
    }

    const warnings = analyzeHost(url.hostname);
    const decodedPath = safeDecode(url.pathname);

    if (NON_ASCII.test(decodedPath)) {
        warnings.push({
            code: 'non_ascii_path',
            detail: 'URL path contains non-ASCII characters'
        });
    }

    return { url, warnings };
}
