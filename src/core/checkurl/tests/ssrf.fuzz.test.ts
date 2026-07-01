import { describe, it, expect } from 'vitest';
import { isBlockedAddress } from '../ssrf';

const randByte = () => Math.floor(Math.random() * 256);

describe('isBlockedAddress: randomized invariants', () => {
    it('always blocks private/loopback/link-local ranges across random hosts', () => {
        for (let i = 0; i < 5000; i++) {
            expect(
                isBlockedAddress(
                    `10.${randByte()}.${randByte()}.${randByte()}`,
                    4
                )
            ).toBe(true);
            expect(
                isBlockedAddress(
                    `127.${randByte()}.${randByte()}.${randByte()}`,
                    4
                )
            ).toBe(true);
            expect(
                isBlockedAddress(`192.168.${randByte()}.${randByte()}`, 4)
            ).toBe(true);
            expect(
                isBlockedAddress(`169.254.${randByte()}.${randByte()}`, 4)
            ).toBe(true);
        }
    });

    it('always blocks random multicast addresses (224.0.0.0/4)', () => {
        for (let i = 0; i < 2000; i++) {
            const first = 224 + Math.floor(Math.random() * 16);
            expect(
                isBlockedAddress(
                    `${first}.${randByte()}.${randByte()}.${randByte()}`,
                    4
                )
            ).toBe(true);
        }
    });

    it('allows random public addresses in 8.0.0.0/8 (a public unicast allocation)', () => {
        for (let i = 0; i < 2000; i++) {
            expect(
                isBlockedAddress(
                    `8.${randByte()}.${randByte()}.${randByte()}`,
                    4
                )
            ).toBe(false);
        }
    });

    it('never throws and always returns a boolean for arbitrary junk input', () => {
        for (let i = 0; i < 2000; i++) {
            const junk = Math.random().toString(36).slice(2) + ':' + randByte();
            expect(
                typeof isBlockedAddress(junk, Math.random() < 0.5 ? 4 : 6)
            ).toBe('boolean');
        }
        for (const bad of [
            '',
            '...',
            '999.999.999.999',
            '10.0.0',
            ':::',
            'gg::1',
            '0x7f.1'
        ]) {
            expect(isBlockedAddress(bad, 4)).toBe(true);
            expect(isBlockedAddress(bad, 6)).toBe(true);
        }
    });
});
