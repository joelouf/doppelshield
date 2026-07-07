export const TOOLTIP = {
    domain: "The host being analyzed, shown decoded to Unicode when it's an internationalized (IDN) name.",
    aLabel: 'The ASCII (Punycode, xn--…) form a browser actually resolves; what an internationalized domain encodes to.',
    glyphs: 'Non-Latin glyphs that visually imitate Latin letters (Unicode UTS #39); the basis of a homograph attack.',
    signals:
        'Structural findings from the scan; reviewable evidence, not a definitive safe or unsafe judgment.',
    httpStatus:
        'The HTTP response code returned by the final destination, grouped by class: 2xx success, 3xx redirect, 4xx and 5xx error.',
    transport:
        "Whether the connection stayed encrypted (HTTPS) end to end; 'Not secure' means it dropped to plain HTTP or never used TLS.",
    destination:
        'The URL the connection resolves to. If it redirects, expand to see the full chain of hops leading here.',
    scannedAt: 'The date and time this scan ran, in UTC.',
    verdict:
        'FLAGGED: confusable impersonation. REVIEW: signals worth a look. CLEAR: no deception signals. INDETERMINATE: the scan could not complete.'
} as const;
