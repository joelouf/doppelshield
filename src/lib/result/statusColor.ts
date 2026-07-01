import { statusTone, type StatusTone } from '@/core/checkurl/httpStatus';

const TONE_VAR: Record<StatusTone, string> = {
    safe: 'var(--ds-safe)',
    neutral: 'var(--ds-text-dim)',
    caution: 'var(--ds-caution)',
    danger: 'var(--ds-danger)'
};

export function statusColor(status: number): string {
    return TONE_VAR[statusTone(status)];
}
