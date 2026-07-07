import { describe, it, expect } from 'vitest';
import { buildContentSecurityPolicy } from './csp';

const directive = (csp: string, name: string) =>
    csp
        .split(';')
        .map((d) => d.trim())
        .find((d) => d.startsWith(name));

describe('buildContentSecurityPolicy', () => {
    it('binds script execution to the per-request nonce with strict-dynamic and no unsafe-inline', () => {
        const scriptSrc = directive(
            buildContentSecurityPolicy('abc123'),
            'script-src'
        );
        expect(scriptSrc).toContain("'nonce-abc123'");
        expect(scriptSrc).toContain("'strict-dynamic'");
        expect(scriptSrc).not.toContain("'unsafe-inline'");
    });
    it('permits the Formspree endpoint in connect-src so the contact form can submit', () => {
        expect(directive(buildContentSecurityPolicy('n'), 'connect-src')).toBe(
            "connect-src 'self' https://formspree.io"
        );
    });
    it('enables unsafe-eval only in development', () => {
        expect(buildContentSecurityPolicy('n', { isDev: true })).toContain(
            "'unsafe-eval'"
        );
        expect(buildContentSecurityPolicy('n', { isDev: false })).not.toContain(
            "'unsafe-eval'"
        );
    });
    it('keeps the rest of the policy locked down', () => {
        const csp = buildContentSecurityPolicy('n');
        expect(directive(csp, 'object-src')).toBe("object-src 'none'");
        expect(directive(csp, 'frame-ancestors')).toBe(
            "frame-ancestors 'none'"
        );
        expect(directive(csp, 'base-uri')).toBe("base-uri 'self'");
        expect(directive(csp, 'default-src')).toBe("default-src 'self'");
        expect(csp).toContain('upgrade-insecure-requests');
    });
});
