'use client';

import { useId, useState } from 'react';
import type { RedirectHop } from '@/core/checkurl/types';
import { statusColor } from '@/lib/result/statusColor';
import { transportIcon } from './statusIcons';
import { Chevron } from './Chevron';
import {
    TRANSPORT_LABEL,
    TRANSPORT_TONE,
    type TransportState
} from '@/lib/result/transport';
import { CollapsibleSection } from './CollapsibleSection';
import { UrlDisplay } from './UrlDisplay';
import { InfoTip } from './InfoTip';
import { TOOLTIP } from '@/lib/tooltips';
import s from './RedirectChain.module.css';

export interface RedirectChainProps {
    hops?: RedirectHop[];
    transport?: TransportState;
    defaultOpen?: boolean;
    unreached?: boolean;
}

function HopRow({
    status,
    url,
    final,
    downgrade
}: {
    status: number;
    url: string;
    final?: boolean;
    downgrade?: boolean;
}) {
    return (
        <li className={`${s.hop} ${final ? s.hopFinal : ''}`}>
            <span
                className={s.dot}
                style={{ background: statusColor(status) }}
                aria-hidden
            />
            <span className={s.status} style={{ color: statusColor(status) }}>
                {status}
            </span>
            <span className={s.url}>
                <UrlDisplay url={url} />
                {downgrade && (
                    <span
                        className={s.downgrade}
                        title='This hop dropped from HTTPS to unencrypted HTTP'
                    >
                        {' ↓ HTTP'}
                    </span>
                )}
            </span>
        </li>
    );
}

export function RedirectChain({
    hops,
    transport,
    defaultOpen,
    unreached
}: RedirectChainProps) {
    const [chainOpen, setChainOpen] = useState(false);
    const chainId = useId();
    const chain = hops ?? [];

    if (chain.length === 0 && !unreached) {
        return null;
    }

    const lastIndex = chain.length - 1;
    const hopCount = unreached ? chain.length : lastIndex;
    const hasPrecedingHops = unreached ? chain.length > 0 : chain.length > 1;
    const chainLabel =
        hopCount > 0
            ? `Destination / ${hopCount} hop${hopCount === 1 ? '' : 's'}`
            : 'Destination';
    const posture =
        transport && !unreached ? (
            <span className={s.transport} data-tone={TRANSPORT_TONE[transport]}>
                {transportIcon(transport)}
                <span className={s.capTrim}>{TRANSPORT_LABEL[transport]}</span>
                <InfoTip label='Transport'>{TOOLTIP.transport}</InfoTip>
            </span>
        ) : undefined;

    return (
        <CollapsibleSection
            title='Connection'
            aside={posture}
            defaultOpen={defaultOpen}
        >
            <div className={s.connField}>
                <div className={s.connLabel}>
                    {hasPrecedingHops ? (
                        <button
                            type='button'
                            className={`${s.connName} ${s.connToggle}`}
                            aria-expanded={chainOpen}
                            aria-controls={chainId}
                            onClick={() => setChainOpen((o) => !o)}
                        >
                            <Chevron direction={chainOpen ? 'down' : 'right'} />
                            {chainLabel}
                        </button>
                    ) : (
                        <span className={`${s.connName} ${s.capTrim}`}>
                            {chainLabel}
                        </span>
                    )}
                    <InfoTip label='Destination'>{TOOLTIP.destination}</InfoTip>
                </div>
                <ol className={s.hops} id={chainId}>
                    {chain.map((hop, i) => {
                        const isFinal = !unreached && i === lastIndex;

                        if (!chainOpen && !isFinal) {
                            return null;
                        }
                        return (
                            <HopRow
                                key={i}
                                status={hop.status}
                                url={hop.url}
                                final={isFinal}
                                downgrade={
                                    i > 0 &&
                                    chain[i - 1]?.url.startsWith('https://') ===
                                        true &&
                                    hop.url.startsWith('http://')
                                }
                            />
                        );
                    })}
                    {unreached && (
                        <li className={s.hop}>
                            <span
                                className={s.dot}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--ds-muted)'
                                }}
                                aria-hidden
                            />
                            <span className={s.unreached}>
                                No response received
                            </span>
                        </li>
                    )}
                </ol>
            </div>
        </CollapsibleSection>
    );
}
