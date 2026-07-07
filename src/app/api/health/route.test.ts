import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('GET /api/health', () => {
    it('returns 200 with a minimal ok body', async () => {
        const res = GET();

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ status: 'ok' });
    });

    it('discloses nothing beyond the status field', async () => {
        const body = (await GET().json()) as Record<string, unknown>;

        expect(Object.keys(body)).toEqual(['status']);
    });
});
