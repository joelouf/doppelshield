import { toParseableUrl } from './url';

const HOST_BUDGET = 48;
const HOST_MIN_LABELS = 3;

export interface UrlParts {
    ok: boolean;
    scheme: string;
    userinfo: string;
    host: string;
    port: string;
    rest: string;
}

const FALLBACK: UrlParts = {
    ok: false,
    scheme: '',
    userinfo: '',
    host: '',
    port: '',
    rest: ''
};

export function splitUrl(raw: string): UrlParts {
    if (!raw) return FALLBACK;

    const schemeMatch = /^([a-z][a-z0-9+.-]*:\/\/)/i.exec(raw);
    const scheme = schemeMatch?.[1] ?? '';
    const afterScheme = raw.slice(scheme.length);

    let parsed: URL;

    try {
        parsed = new URL(toParseableUrl(raw));
    } catch {
        return FALLBACK;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return FALLBACK;
    }

    const boundary = afterScheme.search(/[/?#\\]/);
    const authEnd = boundary === -1 ? afterScheme.length : boundary;
    const authority = afterScheme.slice(0, authEnd);
    const rest = afterScheme.slice(authEnd);
    const atIdx = authority.lastIndexOf('@');
    const userinfo = atIdx === -1 ? '' : authority.slice(0, atIdx + 1);
    const hostPort = atIdx === -1 ? authority : authority.slice(atIdx + 1);

    let host = hostPort;
    let port = '';
    if (hostPort.startsWith('[')) {
        const close = hostPort.indexOf(']');

        if (close !== -1) {
            host = hostPort.slice(0, close + 1);

            const after = hostPort.slice(close + 1);

            if (after.startsWith(':')) port = after;
        }
    } else {
        const colon = hostPort.lastIndexOf(':');

        if (colon !== -1) {
            host = hostPort.slice(0, colon);
            port = hostPort.slice(colon);
        }
    }

    if (
        (parsed.protocol === 'https:' && port === ':443') ||
        (parsed.protocol === 'http:' && port === ':80')
    ) {
        port = '';
    }

    if (!host) return FALLBACK;

    return { ok: true, scheme, userinfo, host, port, rest };
}

export function clampHost(
    host: string,
    budget: number = HOST_BUDGET
): { head: string; tail: string; hiddenCount: number } {
    if (host.length <= budget) return { head: host, tail: '', hiddenCount: 0 };

    const labels = host.split('.');
    const tail =
        labels.length >= HOST_MIN_LABELS
            ? labels.slice(-HOST_MIN_LABELS).join('.')
            : host.slice(-Math.ceil(budget / 2));

    const maxHead = Math.max(0, host.length - tail.length);
    const headRoom = Math.max(1, budget - tail.length - 1);
    const head = host.slice(0, Math.min(headRoom, maxHead));
    const hiddenCount = host.length - head.length - tail.length;

    if (hiddenCount <= 0) return { head: host, tail: '', hiddenCount: 0 };

    return { head, tail, hiddenCount };
}
