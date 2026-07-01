import { describe, it, expect } from 'vitest';
import { remainingDelay } from '../timing';

describe('remainingDelay (constant-time response floor)', () => {
    it('returns the time left until the floor when not yet reached', () => {
        expect(remainingDelay(1000, 500, 1200)).toBe(300);
    });
    it('returns 0 once the floor has already elapsed', () => {
        expect(remainingDelay(1000, 500, 1600)).toBe(0);
    });
    it('returns 0 when the floor is disabled', () => {
        expect(remainingDelay(1000, 0, 1000)).toBe(0);
    });
});
