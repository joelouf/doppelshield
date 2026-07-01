import { describe, it, expect, vi, afterEach } from 'vitest';
import { logger, logSsrfBlock } from '../logger';

afterEach(() => vi.restoreAllMocks());

describe('logger (JSON-line, dependency-free)', () => {
    it('emits one line of valid JSON with level, event, ts, and extra fields', () => {
        const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
        logger.info('unit_test', { foo: 1 });
        expect(spy).toHaveBeenCalledTimes(1);
        const line = spy.mock.calls[0]![0] as string;
        expect(line.endsWith('\n')).toBe(true);
        const parsed = JSON.parse(line) as Record<string, unknown>;
        expect(parsed.level).toBe('info');
        expect(parsed.event).toBe('unit_test');
        expect(parsed.foo).toBe(1);
        expect(typeof parsed.ts).toBe('string');
    });

    it('logSsrfBlock emits an ssrf_blocked warn event with the host', () => {
        const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
        logSsrfBlock({ requestId: 'rid', host: 'evil.example' });
        const parsed = JSON.parse(spy.mock.calls[0]![0] as string) as Record<
            string,
            unknown
        >;
        expect(parsed.level).toBe('warn');
        expect(parsed.event).toBe('ssrf_blocked');
        expect(parsed.host).toBe('evil.example');
    });

    it('writes a fallback line when a payload is non-serializable instead of dropping the event', () => {
        const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
        logger.error('serialize_boom', { big: BigInt(10) });
        expect(spy).toHaveBeenCalledTimes(1);
        const parsed = JSON.parse(spy.mock.calls[0]![0] as string) as Record<
            string,
            unknown
        >;
        expect(parsed.level).toBe('error');
        expect(parsed.event).toBe('serialize_boom');
        expect(parsed._logError).toBe(true);
    });

    it('does not emit a fallback line for a normal payload', () => {
        const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
        logger.info('normal', { ok: true });
        expect(spy).toHaveBeenCalledTimes(1);
        const parsed = JSON.parse(spy.mock.calls[0]![0] as string) as Record<
            string,
            unknown
        >;
        expect(parsed._logError).toBeUndefined();
        expect(parsed.ok).toBe(true);
    });
});
