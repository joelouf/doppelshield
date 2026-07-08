'use client';

import { type MouseEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LinkArrow, linkArrowHost } from '@/components/LinkArrow';
import type { CheckResult, HomographEvidence } from '@/core/checkurl/types';
import { ScanReport } from '@/components/ScanReport';
import { UrlDisplay } from '@/components/UrlDisplay';
import { splitUrl } from '@/lib/urlDisplay';
import { toParseableUrl } from '@/lib/url';
import { SCANNER_RESET_EVENT } from '@/lib/scannerReset';
import { verdictFor } from '@/lib/result/verdict';
import { buildFindings } from '@/lib/result/findings';
import { highlightTones } from '@/lib/highlight';
import { transportPosture, type TransportState } from '@/lib/result/transport';
import s from './page.module.css';

type Phase = 'idle' | 'scanning' | 'done';

const ASSURANCES: ReadonlyArray<readonly [string, string]> = [
    [
        'HOMOGLYPH DETECTION',
        'Internationalized (IDN) hosts have their ASCII A-label decoded to Unicode, then scanned for Cyrillic and Greek characters confusable with Latin letters (Unicode UTS #39).'
    ],
    [
        'CONNECT-TIME GUARD',
        'Resolves and pins the exact IP it connects to, closing the DNS-rebinding and redirect SSRF paths.'
    ],
    [
        'UNIFORM VERDICTS',
        'Blocked and unresponsive hosts return one uniform verdict, so the response does not disclose internal hosts.'
    ]
];

const EXAMPLES = [
    'раypal.com',
    'xn--80ak6aa92e.com',
    'münchen.com',
    'github.com',
    '185.199.108.153'
];

function stampNow(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    return `${date} / ${time} UTC`;
}

function looksScannable(input: string): boolean {
    return /[.:]/.test(input) || /\P{ASCII}/u.test(input);
}

const SR_ONLY: React.CSSProperties = {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0
};

function hostOf(input: string): string {
    try {
        return new URL(toParseableUrl(input)).host || input;
    } catch {
        return input;
    }
}

export default function HomePage() {
    const [url, setUrl] = useState('');
    const [scanned, setScanned] = useState('');
    const [result, setResult] = useState<CheckResult | null>(null);
    const [phase, setPhase] = useState<Phase>('idle');
    const [scannedAt, setScannedAt] = useState('');
    const [scanSeq, setScanSeq] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const runRef = useRef(0);
    const controllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const reset = () => {
            runRef.current += 1;
            controllerRef.current?.abort();
            controllerRef.current = null;
            setUrl('');
            setScanned('');
            setResult(null);
            setScannedAt('');
            setPhase('idle');
        };
        window.addEventListener(SCANNER_RESET_EVENT, reset);
        return () => window.removeEventListener(SCANNER_RESET_EVENT, reset);
    }, []);

    const scan = async (override?: string) => {
        const target = (override ?? url).trim();
        if (target === '' || phase === 'scanning') return;
        const run = ++runRef.current;
        if (override !== undefined) setUrl(override);
        setPhase('scanning');
        if (!looksScannable(target)) {
            await new Promise((r) => setTimeout(r, 680));
            if (runRef.current !== run) return;
            setResult({
                apiVersion: 1,
                ok: false,
                warnings: [],
                error: {
                    code: 'invalid_input',
                    message: 'The URL is invalid.'
                }
            });
            setScanned(target);
            setScannedAt(stampNow());
            setScanSeq((n) => n + 1);
            setPhase('done');
            return;
        }
        const controller = new AbortController();
        controllerRef.current = controller;
        const timeout = setTimeout(() => controller.abort(), 12000);
        let data: CheckResult;
        try {
            const [res] = await Promise.all([
                fetch('/api/checkUrl', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: target }),
                    signal: controller.signal
                }),
                new Promise((r) => setTimeout(r, 680))
            ]);
            try {
                data = (await res.json()) as CheckResult;
            } catch {
                data = {
                    apiVersion: 1,
                    ok: false,
                    warnings: [],
                    error: {
                        code: 'unavailable',
                        message:
                            'The scanner returned an unexpected response. Please try again.'
                    }
                };
            }
        } catch {
            data = {
                apiVersion: 1,
                ok: false,
                warnings: [],
                error: {
                    code: 'unavailable',
                    message:
                        'Could not reach the scanner. Check your connection and try again.'
                }
            };
        } finally {
            clearTimeout(timeout);
        }
        if (runRef.current !== run) return;
        controllerRef.current = null;
        setResult(data);
        setScanned(target);
        setScannedAt(stampNow());
        setScanSeq((n) => n + 1);
        setPhase('done');
    };

    const focusInput = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest('button') || target === inputRef.current) return;
        event.preventDefault();
        inputRef.current?.focus();
    };

    const warnings = result?.warnings ?? [];
    const homograph: HomographEvidence | undefined = result?.homograph;
    const glyphs = warnings.some((w) => w.code.startsWith('homograph_'))
        ? (homograph?.glyphs ?? [])
        : [];
    const verdict = result
        ? verdictFor(result, homograph, glyphs.length)
        : null;
    const announcement = verdict
        ? `${verdict.label}.${verdict.note ? ` ${verdict.note}` : ''}`
        : '';
    const charTones = highlightTones(
        glyphs.map((g) => g.char),
        warnings,
        scanned,
        verdict?.tone === 'flagged' ? 'danger' : 'caution'
    );
    const findings = buildFindings(warnings, glyphs[0]?.script);

    const decodedHost = homograph?.decodedHost;
    const nameHost = decodedHost ?? (scanned ? hostOf(scanned) : '');
    const punycodeNode =
        homograph?.asciiHost &&
        homograph.decodedHost &&
        homograph.asciiHost !== homograph.decodedHost
            ? homograph.asciiHost
            : undefined;
    const reached = !!result && !result.error && !!result.finalUrl;
    const headStatusCode =
        reached && result?.status ? result.status : undefined;
    const headStatus =
        headStatusCode === undefined && result?.error?.code === 'unreachable'
            ? 'NO RESPONSE'
            : undefined;
    const transport: TransportState | undefined =
        reached && result ? transportPosture(result) : undefined;
    const unreached = result?.error?.code === 'unreachable';
    const hostNode = (
        <UrlDisplay url={nameHost} tones={charTones} expandable={false} />
    );
    const enteredParts = scanned ? splitUrl(scanned) : null;
    const pathStr = enteredParts?.ok ? enteredParts.rest : '';
    const pathSuffix = pathStr.length > 1 ? pathStr : '';
    const aLabelNode = punycodeNode ? (
        <UrlDisplay url={`${punycodeNode}${pathSuffix}`} tones={charTones} />
    ) : undefined;

    return (
        <div className={s.page}>
            <section>
                <h1 className={s.headline} data-chunk='1'>
                    Unmask <span className={s.headlineAccent}>deceptive</span>{' '}
                    domains.
                </h1>

                <p
                    className={s.sub}
                    data-chunk='1'
                    style={{ ['--ci']: 1 } as React.CSSProperties}
                >
                    DoppelShield decodes the host, flags look-alike characters,
                    and traces the redirect chain to surface homograph attacks.
                </p>

                <Link
                    href='/about'
                    className={`${s.learn} ${linkArrowHost}`}
                    data-chunk='1'
                    style={{ ['--ci']: 2 } as React.CSSProperties}
                >
                    <span className={s.learnText}>
                        What is a homograph attack?
                    </span>
                    <LinkArrow />
                </Link>
            </section>

            <section
                className={`${s.scanner} ${phase === 'scanning' ? s.scanningBox : ''}`}
                aria-label='URL scanner'
                onMouseDown={focusInput}
                data-chunk='2'
            >
                <span className={`${s.edge} ${s.edgeT}`} aria-hidden />
                <span className={`${s.edge} ${s.edgeL}`} aria-hidden />
                <span className={`${s.edge} ${s.edgeB}`} aria-hidden />
                <span className={`${s.edge} ${s.edgeR}`} aria-hidden />

                <div className={s.scanRow}>
                    <span className={s.prompt} aria-hidden>
                        &gt;
                    </span>
                    <input
                        ref={inputRef}
                        className={s.input}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') void scan();
                        }}
                        placeholder='Enter a URL to scan'
                        spellCheck={false}
                        autoComplete='off'
                        aria-label='URL to scan'
                    />
                    <button
                        type='button'
                        className={s.scanBtn}
                        onClick={() => void scan()}
                        aria-disabled={phase === 'scanning'}
                    >
                        SCAN
                    </button>
                </div>
                {phase === 'scanning' && (
                    <span className={s.scanline} aria-hidden>
                        <span className={s.beam} />
                    </span>
                )}
            </section>

            <div
                className={s.tryRow}
                data-chunk='2'
                style={{ ['--ci']: 1 } as React.CSSProperties}
            >
                <span className={s.tryLabel}>Try:</span>
                {EXAMPLES.map((ex) => (
                    <button
                        key={ex}
                        type='button'
                        className={s.tryChip}
                        onClick={() => void scan(ex)}
                    >
                        {ex}
                    </button>
                ))}
            </div>

            <section
                className={s.output}
                aria-label='Scan result'
                aria-busy={phase === 'scanning'}
                data-chunk='2'
                style={{ ['--ci']: 2 } as React.CSSProperties}
            >
                <div role='status' aria-live='polite' style={SR_ONLY}>
                    {announcement}
                </div>

                {phase === 'idle' && !result && (
                    <div className={s.idle}>
                        <span className={s.idleMark} aria-hidden />
                        READY TO SCAN
                    </div>
                )}

                {phase === 'scanning' && !result && (
                    <div className={s.analyzing}>
                        <span className={s.scanMark} aria-hidden />
                        ANALYZING
                    </div>
                )}

                {result && verdict && (
                    <div
                        key={scanSeq}
                        className={
                            phase === 'scanning' ? s.reportScanning : undefined
                        }
                    >
                        <ScanReport
                            tone={verdict.tone}
                            label={verdict.label}
                            headStatus={headStatus}
                            headStatusCode={headStatusCode}
                            note={verdict.note}
                            host={hostNode}
                            aLabel={aLabelNode}
                            findings={findings}
                            glyphs={glyphs.map((g) => ({
                                char: g.char,
                                codepoint: g.codepoint,
                                script: g.script
                            }))}
                            transport={transport}
                            redirectChain={result.redirectChain}
                            unreached={unreached}
                            scannedAt={scannedAt}
                        />
                    </div>
                )}

                {result && verdict && (
                    <div className={s.reportFooter}>
                        <Link
                            href='/about#limitations'
                            className={`${s.limitations} ${linkArrowHost}`}
                        >
                            <span className={s.limitationsText}>
                                Limitations
                            </span>
                            <LinkArrow />
                        </Link>
                    </div>
                )}
            </section>

            <section className={s.assurance}>
                {ASSURANCES.map(([title, desc], i) => (
                    <div
                        key={title}
                        className={s.assureItem}
                        data-chunk='3'
                        style={{ ['--ci']: i } as React.CSSProperties}
                    >
                        <span className={s.assureTick} aria-hidden />
                        <div className={s.assureTitle}>{title}</div>
                        <div className={s.assureDesc}>{desc}</div>
                    </div>
                ))}
            </section>
        </div>
    );
}
