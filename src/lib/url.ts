const SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:\/\//i;

export function hasScheme(raw: string): boolean {
    return SCHEME_PREFIX.test(raw);
}

export function toParseableUrl(raw: string): string {
    return hasScheme(raw) ? raw : `https://${raw}`;
}
