import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel: string) =>
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const guard = read('./EntranceGuard.tsx');
const globals = read('../app/globals.css');

describe('entrance one-shot CSS/JS contract', () => {
    it('guard keys off an animation name globals.css actually defines', () => {
        const match = guard.match(/ENTRANCE_ANIM\s*=\s*'([^']+)'/);
        expect(match, 'EntranceGuard must declare ENTRANCE_ANIM').toBeTruthy();
        const name = match![1];

        expect(globals).toMatch(new RegExp(`@keyframes\\s+${name}\\b`));
        expect(globals).toMatch(new RegExp(`animation:\\s*${name}\\b`));
    });

    it('entrance is gated so a re-entered node cannot replay it', () => {
        expect(globals).toContain('[data-chunk]:not([data-entered])');
    });
});
