'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { HighlightTone } from '@/lib/highlight';
import { splitUrl, clampHost } from '@/lib/urlDisplay';
import s from './UrlDisplay.module.css';
import { Chevron } from './Chevron';

interface UrlDisplayProps {
    url: string;
    tones?: ReadonlyMap<string, HighlightTone>;
    expandable?: boolean;
}

function Glyphs({
    text,
    tones
}: {
    text: string;
    tones?: ReadonlyMap<string, HighlightTone>;
}) {
    const nodes: ReactNode[] = [];
    let run = '';
    let key = 0;
    const flush = () => {
        if (run) {
            nodes.push(<span key={key++}>{run}</span>);
            run = '';
        }
    };

    for (const ch of text) {
        if ((ch.codePointAt(0) ?? 0) <= 0x7f) {
            run += ch;
            continue;
        }

        flush();

        const tone = tones?.get(ch);
        const className =
            tone === 'danger'
                ? s.confusable
                : tone === 'caution'
                  ? s.confusableCaution
                  : s.nonAscii;
        nodes.push(
            <mark key={key++} className={className}>
                {ch}
            </mark>
        );
    }

    flush();

    return <>{nodes}</>;
}

function Expander({ open, onClick }: { open: boolean; onClick: () => void }) {
    return (
        <button
            type='button'
            className={s.expander}
            aria-expanded={open}
            aria-label={open ? 'Hide full URL' : 'Show full URL'}
            onClick={onClick}
        >
            <Chevron direction={open ? 'left' : 'right'} />
            <span>{open ? 'hide' : 'show'}</span>
        </button>
    );
}

export function UrlDisplay({ url, tones, expandable = true }: UrlDisplayProps) {
    const [open, setOpen] = useState(false);
    const [overflowing, setOverflowing] = useState(false);
    const bodyRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!expandable) return;

        const body = bodyRef.current;

        if (!body) return;

        const measure = () =>
            setOverflowing(body.scrollWidth - body.clientWidth > 1);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(body);

        return () => observer.disconnect();
    }, [expandable]);

    const parts = splitUrl(url);
    const full = open || !expandable;

    let hostNode: ReactNode = null;
    let hostElided = false;

    if (parts.ok) {
        const h = clampHost(parts.host);
        hostElided = h.hiddenCount > 0;
        hostNode =
            full || !hostElided ? (
                <Glyphs text={parts.host} tones={tones} />
            ) : (
                <>
                    <Glyphs text={h.head} tones={tones} />
                    <span className={s.ellipsis}>…</span>
                    <Glyphs text={h.tail} tones={tones} />
                </>
            );
    }

    const showExpander = expandable && (open || overflowing || hostElided);

    return (
        <span className={s.url} data-open={full} title={url}>
            <span className={s.body} ref={bodyRef}>
                {parts.ok ? (
                    <>
                        {parts.scheme && (
                            <span className={s.scheme}>{parts.scheme}</span>
                        )}
                        {parts.userinfo && (
                            <span className={s.userinfo}>{parts.userinfo}</span>
                        )}
                        <span className={s.host}>{hostNode}</span>
                        {parts.port && (
                            <span className={s.port}>{parts.port}</span>
                        )}
                        {parts.rest && (
                            <span className={s.path}>
                                <Glyphs text={parts.rest} tones={tones} />
                            </span>
                        )}
                    </>
                ) : (
                    <span className={s.path}>
                        <Glyphs text={url} tones={tones} />
                    </span>
                )}
            </span>
            {showExpander && (
                <Expander open={open} onClick={() => setOpen(!open)} />
            )}
        </span>
    );
}
