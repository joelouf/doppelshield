import { logger } from './logger';

export function intEnv(
    value: string | undefined,
    fallback: number,
    allowZero = false,
    name?: string
): number {
    const present = value !== undefined && value !== '';
    const n = Number(value);

    if (
        !Number.isFinite(n) ||
        !Number.isInteger(n) ||
        n < 0 ||
        (n === 0 && !allowZero)
    ) {
        if (present && name) {
            logger.warn('config_invalid_env', {
                name,
                value,
                fallback
            });
        }

        return fallback;
    }

    return n;
}

export function clampInt(
    value: string | undefined,
    fallback: number,
    min: number,
    max: number,
    name?: string
): number {
    return Math.min(Math.max(intEnv(value, fallback, false, name), min), max);
}

export function coherentDeadline(
    deadlineMs: number,
    timeoutMs: number
): number {
    return Math.max(deadlineMs, timeoutMs);
}

export function portsEnv(
    value: string | undefined,
    fallback: number[],
    name?: string
): ReadonlySet<number> {
    if (!value) return new Set(fallback);
    const entries = value
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p !== '');
    const parsed = entries
        .map((p) => Number(p))
        .filter((p) => Number.isInteger(p) && p > 0 && p <= 65535);
    const result = new Set(parsed.length > 0 ? parsed : fallback);

    if (name && (entries.length === 0 || parsed.length < entries.length)) {
        logger.warn('config_invalid_env', {
            name,
            value,
            applied: [...result].join(',')
        });
    }

    return result;
}

export function headerEnv(value: string | undefined): string {
    return (value ?? '').trim().toLowerCase();
}

export function defaultMinResponseMs(
    env: string | undefined = process.env.NODE_ENV
): number {
    return env === 'production' ? 500 : 0;
}

const timeoutMs = clampInt(
    process.env.CHECKURL_TIMEOUT_MS,
    5000,
    1,
    120000,
    'CHECKURL_TIMEOUT_MS'
);
const totalDeadlineMs = coherentDeadline(
    clampInt(
        process.env.CHECKURL_TOTAL_DEADLINE_MS,
        10000,
        1,
        300000,
        'CHECKURL_TOTAL_DEADLINE_MS'
    ),
    timeoutMs
);

export const CONFIG = {
    timeoutMs,
    totalDeadlineMs,
    maxRedirects: intEnv(
        process.env.CHECKURL_MAX_REDIRECTS,
        3,
        true,
        'CHECKURL_MAX_REDIRECTS'
    ),
    maxUrlLength: intEnv(
        process.env.CHECKURL_MAX_URL_LENGTH,
        2048,
        false,
        'CHECKURL_MAX_URL_LENGTH'
    ),
    allowedPorts: portsEnv(
        process.env.CHECKURL_ALLOWED_PORTS,
        [80, 443],
        'CHECKURL_ALLOWED_PORTS'
    ),
    userAgent:
        process.env.CHECKURL_USER_AGENT ??
        'DoppelShieldBot/1.0 (+https://doppelshield.com/bot)',
    trustedIpHeader: headerEnv(process.env.CHECKURL_TRUSTED_IP_HEADER),
    maxSockets: clampInt(
        process.env.CHECKURL_MAX_SOCKETS,
        64,
        1,
        10000,
        'CHECKURL_MAX_SOCKETS'
    ),
    maxConcurrentScans: clampInt(
        process.env.CHECKURL_MAX_CONCURRENT_SCANS,
        50,
        1,
        10000,
        'CHECKURL_MAX_CONCURRENT_SCANS'
    ),
    maxBodyBytes: clampInt(
        process.env.CHECKURL_MAX_BODY_BYTES,
        8192,
        1,
        10 * 1024 * 1024,
        'CHECKURL_MAX_BODY_BYTES'
    ),
    minResponseMs: intEnv(
        process.env.CHECKURL_MIN_RESPONSE_MS,
        defaultMinResponseMs(),
        true,
        'CHECKURL_MIN_RESPONSE_MS'
    ),
    rateLimit: {
        max: clampInt(
            process.env.CHECKURL_RATE_LIMIT_MAX,
            20,
            1,
            10000,
            'CHECKURL_RATE_LIMIT_MAX'
        ),
        windowMs: clampInt(
            process.env.CHECKURL_RATE_LIMIT_WINDOW_MS,
            60000,
            1000,
            3600000,
            'CHECKURL_RATE_LIMIT_WINDOW_MS'
        )
    }
} as const;
