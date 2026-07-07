import { describe, it, expect } from 'vitest';
import { statusTone } from '../httpStatus';

describe('statusTone', () => {
    it('maps response classes to tones', () => {
        expect(statusTone(200)).toBe('safe');
        expect(statusTone(204)).toBe('safe');
        expect(statusTone(301)).toBe('neutral');
        expect(statusTone(404)).toBe('caution');
        expect(statusTone(500)).toBe('danger');
    });
    it('treats unknown or zero status as neutral', () => {
        expect(statusTone(0)).toBe('neutral');
        expect(statusTone(100)).toBe('neutral');
    });
});
