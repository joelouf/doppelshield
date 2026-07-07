import { describe, it, expect, vi, afterEach } from 'vitest';
import { CONFIG, defaultMinResponseMs, headerEnv } from '../config';
import { intEnv, clampInt, coherentDeadline } from '../config';
import { logger } from '../logger';

describe('CONFIG', () => {
    it('exposes sane defaults', () => {
        expect(CONFIG.timeoutMs).toBe(5000);
        expect(CONFIG.totalDeadlineMs).toBe(10000);
        expect(CONFIG.maxRedirects).toBe(3);
        expect(CONFIG.maxUrlLength).toBe(2048);
        expect(CONFIG.allowedPorts.has(80)).toBe(true);
        expect(CONFIG.allowedPorts.has(443)).toBe(true);
        expect(CONFIG.allowedPorts.has(6379)).toBe(false);
        expect(CONFIG.userAgent).toMatch(/DoppelShield/);
        expect(CONFIG.rateLimit.max).toBe(20);
        expect(CONFIG.rateLimit.windowMs).toBe(60000);
        expect(CONFIG.totalDeadlineMs).toBeGreaterThan(CONFIG.timeoutMs);
    });
    it('treats an unconfigured trusted client-IP header as unset (no platform assumed)', () => {
        expect(headerEnv(undefined)).toBe('');
        expect(headerEnv('')).toBe('');
        expect(headerEnv('   ')).toBe('');
    });
    it('normalizes a configured trusted client-IP header (trim + lowercase)', () => {
        expect(headerEnv('  X-Real-IP ')).toBe('x-real-ip');
        expect(headerEnv('CF-Connecting-IP')).toBe('cf-connecting-ip');
    });
    it('reads the trusted client-IP header from the environment', () => {
        expect(CONFIG.trustedIpHeader).toBe('x-vercel-forwarded-for');
    });
    it('enables the response-time floor only in production by default', () => {
        expect(defaultMinResponseMs('production')).toBeGreaterThan(0);
        expect(defaultMinResponseMs('test')).toBe(0);
        expect(defaultMinResponseMs('development')).toBe(0);
    });
    it('exposes a non-negative minResponseMs (floored off under test)', () => {
        expect(CONFIG.minResponseMs).toBe(0);
    });
});

describe('intEnv operator feedback', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('warns and falls back when a present value is malformed', () => {
        const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        expect(intEnv('abc', 5000, false, 'CHECKURL_TIMEOUT_MS')).toBe(5000);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]![1]).toMatchObject({
            name: 'CHECKURL_TIMEOUT_MS',
            value: 'abc'
        });
    });

    it('warns and falls back when a present value is out of range (negative)', () => {
        const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        expect(intEnv('-5', 5000, false, 'CHECKURL_TIMEOUT_MS')).toBe(5000);
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it('does not warn when the value is absent', () => {
        const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        expect(intEnv(undefined, 5000, false, 'CHECKURL_TIMEOUT_MS')).toBe(
            5000
        );
        expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn when the value is an empty string (treated as absent)', () => {
        const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        expect(intEnv('', 5000, false, 'CHECKURL_TIMEOUT_MS')).toBe(5000);
        expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn when the value is valid', () => {
        const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        expect(intEnv('1234', 5000, false, 'CHECKURL_TIMEOUT_MS')).toBe(1234);
        expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn when no name is supplied even for a bad value', () => {
        const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        expect(intEnv('abc', 5000)).toBe(5000);
        expect(warn).not.toHaveBeenCalled();
    });
});

describe('clampInt upper bounds', () => {
    it('clamps a present value above the maximum down to the max', () => {
        expect(clampInt('999999999', 5000, 0, 120000)).toBe(120000);
    });

    it('clamps a present value below the minimum up to the min', () => {
        expect(clampInt('1', 5000, 100, 120000)).toBe(100);
    });

    it('passes a within-range value through unchanged', () => {
        expect(clampInt('5000', 1000, 0, 120000)).toBe(5000);
    });
});

describe('config upper clamps are applied to all numeric knobs', () => {
    it('caps timeoutMs at a sane upper bound', () => {
        expect(CONFIG.timeoutMs).toBeLessThanOrEqual(120000);
    });
    it('caps totalDeadlineMs at a sane upper bound', () => {
        expect(CONFIG.totalDeadlineMs).toBeLessThanOrEqual(300000);
    });
    it('caps maxConcurrentScans at a sane upper bound', () => {
        expect(CONFIG.maxConcurrentScans).toBeLessThanOrEqual(10000);
    });
    it('caps maxSockets at a sane upper bound', () => {
        expect(CONFIG.maxSockets).toBeLessThanOrEqual(10000);
    });
    it('caps maxBodyBytes at a sane upper bound', () => {
        expect(CONFIG.maxBodyBytes).toBeLessThanOrEqual(10 * 1024 * 1024);
    });
});

describe('coherentDeadline invariant', () => {
    it('raises a deadline below the timeout up to the timeout', () => {
        expect(coherentDeadline(8000, 5000)).toBe(8000);
        expect(coherentDeadline(3000, 5000)).toBe(5000);
    });

    it('leaves a deadline already at or above the timeout unchanged', () => {
        expect(coherentDeadline(10000, 5000)).toBe(10000);
        expect(coherentDeadline(5000, 5000)).toBe(5000);
    });

    it('guarantees the live config keeps totalDeadlineMs >= timeoutMs', () => {
        expect(CONFIG.totalDeadlineMs).toBeGreaterThanOrEqual(CONFIG.timeoutMs);
    });
});
