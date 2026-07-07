export class BodyTooLargeError extends Error {
    constructor() {
        super('Request body exceeds the maximum allowed size.');
        this.name = 'BodyTooLargeError';
    }
}

export class BodyReadTimeoutError extends Error {
    constructor() {
        super('Request body was not fully received in time.');
        this.name = 'BodyReadTimeoutError';
    }
}

// Race a single read against the abort signal so a slow producer cannot hold the reader open past the deadline the caller set.
function readWithSignal<T>(
    reader: ReadableStreamDefaultReader<T>,
    signal?: AbortSignal
): Promise<ReadableStreamReadResult<T>> {
    if (!signal) return reader.read();
    if (signal.aborted) return Promise.reject(new BodyReadTimeoutError());

    let onAbort!: () => void;
    const aborted = new Promise<never>((_, reject) => {
        onAbort = () => reject(new BodyReadTimeoutError());
        signal.addEventListener('abort', onAbort, { once: true });
    });

    return Promise.race([reader.read(), aborted]).finally(() => {
        signal.removeEventListener('abort', onAbort);
    });
}

export async function readCappedJson(
    body: ReadableStream<Uint8Array> | null,
    maxBytes: number,
    signal?: AbortSignal
): Promise<unknown> {
    if (!body) throw new Error('Request has no body.');

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
        for (;;) {
            const { done, value } = await readWithSignal(reader, signal);

            if (done) break;
            if (!value) continue;

            total += value.byteLength;

            if (total > maxBytes) throw new BodyTooLargeError();

            chunks.push(value);
        }
    } catch (err) {
        await reader.cancel().catch(() => {});
        throw err;
    } finally {
        reader.releaseLock();
    }

    const buffer = new Uint8Array(total);
    let offset = 0;

    for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return JSON.parse(new TextDecoder().decode(buffer));
}
