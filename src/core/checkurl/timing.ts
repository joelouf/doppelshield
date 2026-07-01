export function remainingDelay(
    startedAtMs: number,
    minMs: number,
    now: number
): number {
    return Math.max(0, startedAtMs + minMs - now);
}

export async function enforceMinDuration(
    startedAtMs: number,
    minMs: number
): Promise<void> {
    const wait = remainingDelay(startedAtMs, minMs, Date.now());

    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}
