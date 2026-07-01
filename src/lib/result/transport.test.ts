import { describe, it, expect } from 'vitest';
import type { CheckResult, RedirectHop } from '@/core/checkurl/types';
import { transportPosture, hasHttpsDowngrade } from './transport';

function result(partial: Partial<CheckResult>): CheckResult {
    return {
        apiVersion: 1,
        ok: true,
        redirectChain: [],
        warnings: [],
        ...partial
    };
}

const hop = (url: string, status = 200): RedirectHop => ({ url, status });

describe('hasHttpsDowngrade', () => {
    it('detects an https to http transition', () => {
        expect(
            hasHttpsDowngrade([
                hop('https://a.com/', 301),
                hop('http://a.com/')
            ])
        ).toBe(true);
    });

    it('ignores an http to https upgrade', () => {
        expect(
            hasHttpsDowngrade([
                hop('http://a.com/', 301),
                hop('https://a.com/')
            ])
        ).toBe(false);
    });

    it('flags a mid-chain downgrade even when it ends on https', () => {
        expect(
            hasHttpsDowngrade([
                hop('https://a.com/', 301),
                hop('http://a.com/b', 301),
                hop('https://a.com/c')
            ])
        ).toBe(true);
    });

    it('returns false for a single hop', () => {
        expect(hasHttpsDowngrade([hop('https://a.com/')])).toBe(false);
    });
});

describe('transportPosture', () => {
    it('reports secure when the final URL is https and no downgrade occurred', () => {
        expect(
            transportPosture(
                result({
                    finalUrl: 'https://example.com/',
                    redirectChain: [hop('https://example.com/')]
                })
            )
        ).toBe('secure');
    });

    it('reports secure for an http to https upgrade', () => {
        expect(
            transportPosture(
                result({
                    finalUrl: 'https://example.com/',
                    redirectChain: [
                        hop('http://example.com/', 301),
                        hop('https://example.com/')
                    ]
                })
            )
        ).toBe('secure');
    });

    it('reports downgraded when an https hop drops to http', () => {
        expect(
            transportPosture(
                result({
                    finalUrl: 'http://example.com/login',
                    redirectChain: [
                        hop('https://example.com/', 301),
                        hop('http://example.com/login')
                    ]
                })
            )
        ).toBe('downgraded');
    });

    it('reports not encrypted for a plain http destination with no prior https', () => {
        expect(
            transportPosture(
                result({
                    finalUrl: 'http://example.com/',
                    redirectChain: [hop('http://example.com/')]
                })
            )
        ).toBe('unencrypted');
    });

    it('reports unverified when there is no final URL', () => {
        expect(
            transportPosture(
                result({
                    finalUrl: undefined,
                    error: { code: 'unreachable', message: 'no response' }
                })
            )
        ).toBe('unverified');
    });
});
