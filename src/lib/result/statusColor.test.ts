import { describe, it, expect } from 'vitest';
import { statusColor } from './statusColor';

describe('statusColor', () => {
    it('maps 2xx to the safe token', () => {
        expect(statusColor(200)).toBe('var(--ds-safe)');
        expect(statusColor(204)).toBe('var(--ds-safe)');
    });

    it('maps 3xx to the dim token', () => {
        expect(statusColor(301)).toBe('var(--ds-text-dim)');
        expect(statusColor(308)).toBe('var(--ds-text-dim)');
    });

    it('maps 4xx to the caution token', () => {
        expect(statusColor(404)).toBe('var(--ds-caution)');
        expect(statusColor(429)).toBe('var(--ds-caution)');
    });

    it('maps 5xx to the danger token', () => {
        expect(statusColor(500)).toBe('var(--ds-danger)');
        expect(statusColor(503)).toBe('var(--ds-danger)');
    });

    it('falls back to the dim token outside known classes', () => {
        expect(statusColor(199)).toBe('var(--ds-text-dim)');
        expect(statusColor(600)).toBe('var(--ds-text-dim)');
    });
});
