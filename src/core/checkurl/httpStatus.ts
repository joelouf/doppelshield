export type StatusTone = 'safe' | 'neutral' | 'caution' | 'danger';

export function statusTone(status: number): StatusTone {
    if (status >= 200 && status < 300) return 'safe';
    if (status >= 300 && status < 400) return 'neutral';
    if (status >= 400 && status < 500) return 'caution';
    if (status >= 500 && status < 600) return 'danger';

    return 'neutral';
}
