type Level = 'info' | 'warn' | 'error';

function emit(
    level: Level,
    event: string,
    fields: Record<string, unknown>
): void {
    try {
        process.stdout.write(
            JSON.stringify({
                level,
                ts: new Date().toISOString(),
                event,
                ...fields
            }) + '\n'
        );
    } catch {
        try {
            process.stdout.write(
                JSON.stringify({ level, event, _logError: true }) + '\n'
            );
        } catch {}
    }
}

export const logger = {
    info: (event: string, fields: Record<string, unknown> = {}) =>
        emit('info', event, fields),
    warn: (event: string, fields: Record<string, unknown> = {}) =>
        emit('warn', event, fields),
    error: (event: string, fields: Record<string, unknown> = {}) =>
        emit('error', event, fields)
};

export function logSsrfBlock(fields: {
    requestId?: string;
    host?: string;
}): void {
    emit('warn', 'ssrf_blocked', fields);
}
