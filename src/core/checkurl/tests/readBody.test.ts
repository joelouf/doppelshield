import { describe, it, expect } from 'vitest';
import {
    readCappedJson,
    BodyTooLargeError,
    BodyReadTimeoutError
} from '../readBody';

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
    return new ReadableStream({
        start(controller) {
            for (const chunk of chunks) controller.enqueue(chunk);
            controller.close();
        }
    });
}

const enc = (s: string) => new TextEncoder().encode(s);

describe('readCappedJson', () => {
    it('parses a JSON body within the cap', async () => {
        const body = streamOf([
            enc(JSON.stringify({ url: 'http://example.com' }))
        ]);
        await expect(readCappedJson(body, 1000)).resolves.toEqual({
            url: 'http://example.com'
        });
    });

    it('rejects a body larger than the cap with no Content-Length to consult', async () => {
        const body = streamOf([enc('x'.repeat(100))]);
        await expect(readCappedJson(body, 50)).rejects.toBeInstanceOf(
            BodyTooLargeError
        );
    });

    it('stops reading once the cap is exceeded instead of draining the whole body', async () => {
        let pulled = 0;
        const chunk = enc('x'.repeat(10));
        const body = new ReadableStream<Uint8Array>({
            pull(controller) {
                pulled++;
                controller.enqueue(chunk);
            }
        });
        await expect(readCappedJson(body, 50)).rejects.toBeInstanceOf(
            BodyTooLargeError
        );
        expect(pulled).toBeLessThan(10);
    });

    it('throws on invalid JSON within the cap', async () => {
        const body = streamOf([enc('not json')]);
        await expect(readCappedJson(body, 1000)).rejects.toThrow();
    });

    it('throws when there is no body stream', async () => {
        await expect(readCappedJson(null, 1000)).rejects.toThrow();
    });

    it('rejects when the abort signal fires before the body completes', async () => {
        const controller = new AbortController();
        const body = new ReadableStream<Uint8Array>({ start() {} });
        const pending = readCappedJson(body, 1000, controller.signal);
        setTimeout(() => controller.abort(), 20);
        await expect(pending).rejects.toBeInstanceOf(BodyReadTimeoutError);
    }, 1000);
});
