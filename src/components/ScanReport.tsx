import type { ReactNode } from 'react';
import type { RedirectHop } from '@/core/checkurl/types';
import { RedirectChain } from './RedirectChain';
import { CollapsibleSection } from './CollapsibleSection';
import { toneIcon } from './statusIcons';
import { InfoTip } from './InfoTip';
import { statusColor } from '@/lib/result/statusColor';
import { TOOLTIP } from '@/lib/tooltips';
import type { TransportState } from '@/lib/result/transport';
import s from './ScanReport.module.css';

export interface ReportGlyph {
    char: string;
    codepoint: string;
    script: string;
}

export type ReportTone = 'flagged' | 'caution' | 'clear' | 'indeterminate';

export interface ReportFinding {
    label: string;
    tone: 'danger' | 'caution' | 'neutral';
    detail: ReactNode;
}

export interface ScanReportProps {
    tone: ReportTone;
    label: string;
    headStatus?: ReactNode;
    headStatusCode?: number;
    transport?: TransportState;
    note?: ReactNode;
    host: ReactNode;
    aLabel?: ReactNode;
    findings?: ReportFinding[];
    glyphs?: ReportGlyph[];
    redirectChain?: RedirectHop[];
    unreached?: boolean;
    scannedAt?: ReactNode;
}

const BAND_BAR: Record<ReportTone, string> = {
    flagged: 'danger',
    caution: 'caution',
    clear: 'safe',
    indeterminate: 'neutral'
};

const BAND_TONE: Record<
    ReportTone,
    'flagged' | 'review' | 'clear' | 'indeterminate'
> = {
    flagged: 'flagged',
    caution: 'review',
    clear: 'clear',
    indeterminate: 'indeterminate'
};

function badgeStyle(band: ReportTone): React.CSSProperties {
    const c = BAND_BAR[band];

    if (band === 'flagged' || band === 'caution') {
        return {
            color: `var(--ds-on-${c})`,
            background: `var(--ds-${c}-fill)`,
            borderColor: `var(--ds-${c}-fill)`
        };
    }

    if (band === 'clear') {
        return { color: 'var(--ds-safe)', borderColor: 'var(--ds-safe)' };
    }

    return {
        color: 'var(--ds-text-dim)',
        borderColor: 'var(--ds-border-bright)'
    };
}

function revealAttrs(
    index: number | undefined,
    base?: string
): { className?: string; style?: React.CSSProperties } {
    const className = [base, index !== undefined ? s.reveal : undefined]
        .filter(Boolean)
        .join(' ');
    return {
        className: className || undefined,
        style:
            index !== undefined
                ? ({ ['--i']: index } as React.CSSProperties)
                : undefined
    };
}

export function FindingRow({
    finding,
    reveal
}: {
    finding: ReportFinding;
    reveal?: number;
}) {
    const state =
        finding.tone === 'danger'
            ? 'flagged'
            : finding.tone === 'caution'
              ? 'caution'
              : 'clear';
    return (
        <div {...revealAttrs(reveal, s.scRow)} data-state={state}>
            <span className={s.scTag}>{finding.label}</span>
            <span className={s.scDetail}>{finding.detail}</span>
        </div>
    );
}

export function GlyphCard({
    glyph,
    reveal
}: {
    glyph: ReportGlyph;
    reveal?: number;
}) {
    const description = `${glyph.script} character ${glyph.codepoint}`;

    return (
        <div
            {...revealAttrs(reveal, s.glyphBezel)}
            role='group'
            aria-label={description}
        >
            <div className={s.glyphCard} aria-hidden>
                <div className={s.glyphChar}>{glyph.char}</div>
                <div className={s.glyphCode}>{glyph.codepoint}</div>
                <div className={s.glyphScript}>{glyph.script}</div>
            </div>
        </div>
    );
}

function Field({
    label,
    hint,
    reveal,
    children
}: {
    label: string;
    hint?: string;
    reveal?: number;
    children: ReactNode;
}) {
    return (
        <div {...revealAttrs(reveal, s.field)}>
            <div className={s.fieldLabel}>
                <span className={s.capTrim}>{label}</span>
                {hint && <InfoTip label={label}>{hint}</InfoTip>}
            </div>
            {children}
        </div>
    );
}

export function ScanReport({
    tone,
    label,
    headStatus,
    headStatusCode,
    transport,
    note,
    host,
    aLabel,
    findings,
    glyphs,
    redirectChain,
    unreached,
    scannedAt
}: ScanReportProps) {
    const findingList = findings ?? [];
    const glyphList = glyphs ?? [];
    const hasChain = (redirectChain?.length ?? 0) >= 1;
    const hasEvidence = glyphList.length > 0 || findingList.length > 0;
    const hasMeta = !!headStatus || headStatusCode !== undefined;

    let r = 0;
    const iDomain = r++;
    const iVerdict = r++;
    const iNote = note ? r++ : undefined;
    const iMeta = hasMeta ? r++ : undefined;
    const iALabel = aLabel ? r++ : undefined;
    const iGlyphField = glyphList.length > 0 ? r++ : undefined;
    const glyphBase = r;
    r += glyphList.length;
    const iSignalField = findingList.length > 0 ? r++ : undefined;
    const signalBase = r;
    r += findingList.length;
    const iChain = hasChain || unreached ? r : undefined;

    return (
        <div className={s.report}>
            <CollapsibleSection
                title='Results'
                aside={
                    scannedAt ? (
                        <span className={s.headTime}>
                            <span className={s.capTrim}>{scannedAt}</span>
                            <InfoTip label='Scan time'>
                                {TOOLTIP.scannedAt}
                            </InfoTip>
                        </span>
                    ) : undefined
                }
                defaultOpen
            >
                <div className={s.verdictBody}>
                    <div className={s.verdictMain}>
                        <Field
                            label='Domain'
                            hint={TOOLTIP.domain}
                            reveal={iDomain}
                        >
                            <div className={s.subjectHost}>{host}</div>
                        </Field>
                        <Field
                            label='Verdict'
                            hint={TOOLTIP.verdict}
                            reveal={iVerdict}
                        >
                            <span className={s.badge} style={badgeStyle(tone)}>
                                {toneIcon(BAND_TONE[tone])}
                                {label}
                            </span>
                        </Field>
                        {note && (
                            <p {...revealAttrs(iNote, s.note)} aria-hidden>
                                {note}
                            </p>
                        )}
                    </div>
                    {(headStatus || headStatusCode !== undefined) && (
                        <div {...revealAttrs(iMeta, s.verdictMeta)}>
                            <div className={`${s.fieldValue} ${s.statusValue}`}>
                                <span className={s.capTrim}>
                                    {headStatusCode !== undefined ? (
                                        <>
                                            HTTP{' '}
                                            <span
                                                style={{
                                                    color: statusColor(
                                                        headStatusCode
                                                    ),
                                                    fontWeight: 700
                                                }}
                                            >
                                                {headStatusCode}
                                            </span>
                                        </>
                                    ) : (
                                        headStatus
                                    )}
                                </span>
                                <InfoTip label='HTTP status'>
                                    {TOOLTIP.httpStatus}
                                </InfoTip>
                            </div>
                        </div>
                    )}
                </div>
            </CollapsibleSection>

            {hasEvidence && (
                <CollapsibleSection title='Findings' defaultOpen>
                    {aLabel && (
                        <Field
                            label='A-label'
                            hint={TOOLTIP.aLabel}
                            reveal={iALabel}
                        >
                            <div className={s.fieldValue}>{aLabel}</div>
                        </Field>
                    )}
                    {glyphList.length > 0 && (
                        <Field
                            label='Glyphs'
                            hint={TOOLTIP.glyphs}
                            reveal={iGlyphField}
                        >
                            <div className={s.glyphRow}>
                                {glyphList.map((g, idx) => (
                                    <GlyphCard
                                        key={g.codepoint}
                                        glyph={g}
                                        reveal={glyphBase + idx}
                                    />
                                ))}
                            </div>
                        </Field>
                    )}
                    {findingList.length > 0 && (
                        <Field
                            label='Signals'
                            hint={TOOLTIP.signals}
                            reveal={iSignalField}
                        >
                            <div className={s.findings}>
                                {findingList.map((f, i) => (
                                    <FindingRow
                                        key={i}
                                        finding={f}
                                        reveal={signalBase + i}
                                    />
                                ))}
                            </div>
                        </Field>
                    )}
                </CollapsibleSection>
            )}

            {(hasChain || unreached) && (
                <div {...revealAttrs(iChain, s.chainSection)}>
                    <RedirectChain
                        hops={redirectChain}
                        transport={transport}
                        unreached={unreached}
                        defaultOpen
                    />
                </div>
            )}
        </div>
    );
}
