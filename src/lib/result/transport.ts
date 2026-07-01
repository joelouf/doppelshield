import type { CheckResult, RedirectHop } from '@/core/checkurl/types';

export type TransportState =
    'secure' | 'downgraded' | 'unencrypted' | 'unverified';

export function hasHttpsDowngrade(chain: RedirectHop[]): boolean {
    return chain.some(
        (hop, i) =>
            i > 0 &&
            chain[i - 1]?.url.startsWith('https://') &&
            hop.url.startsWith('http://')
    );
}

export function transportPosture(result: CheckResult): TransportState {
    if (!result.finalUrl) return 'unverified';
    if (hasHttpsDowngrade(result.redirectChain ?? [])) return 'downgraded';
    if (result.finalUrl.startsWith('http://')) return 'unencrypted';

    return 'secure';
}

export const TRANSPORT_LABEL: Record<TransportState, string> = {
    secure: 'Secure',
    downgraded: 'Not secure',
    unencrypted: 'Not secure',
    unverified: 'Unverified'
};

export const TRANSPORT_TONE: Record<
    TransportState,
    'safe' | 'caution' | 'neutral'
> = {
    secure: 'safe',
    downgraded: 'caution',
    unencrypted: 'caution',
    unverified: 'neutral'
};
