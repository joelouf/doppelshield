'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconInfo } from './statusIcons';
import s from './InfoTip.module.css';

const POPOVER_WIDTH = 280;

export function InfoTip({
    label,
    children
}: {
    label: string;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(
        null
    );
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const closeTimer = useRef<number | undefined>(undefined);
    const id = useId();

    const cancelClose = () => {
        if (closeTimer.current !== undefined) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = undefined;
        }
    };
    const openNow = () => {
        cancelClose();
        setOpen(true);
    };
    const scheduleClose = () => {
        cancelClose();
        closeTimer.current = window.setTimeout(() => setOpen(false), 120);
    };

    useEffect(() => {
        if (!open) return;
        const place = () => {
            const trigger = triggerRef.current;
            if (!trigger) return;
            const r = trigger.getBoundingClientRect();
            const left = Math.max(
                8,
                Math.min(r.left, window.innerWidth - POPOVER_WIDTH - 8)
            );
            setCoords({ top: r.bottom + 8, left });
        };
        place();

        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        return () => {
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
                triggerRef.current?.focus();
            }
        };
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Node;
            if (
                !triggerRef.current?.contains(target) &&
                !popoverRef.current?.contains(target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onPointerDown);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, [open]);

    useEffect(() => cancelClose, []);

    return (
        <span className={s.wrap}>
            <button
                ref={triggerRef}
                type='button'
                className={s.trigger}
                aria-label={`About ${label}`}
                aria-expanded={open}
                aria-describedby={open ? id : undefined}
                onClick={openNow}
                onMouseEnter={openNow}
                onMouseLeave={scheduleClose}
                onBlur={scheduleClose}
            >
                <IconInfo size={12} />
            </button>
            {open &&
                coords &&
                createPortal(
                    <div
                        ref={popoverRef}
                        id={id}
                        role='tooltip'
                        className={s.popover}
                        style={{ top: coords.top, left: coords.left }}
                        onMouseEnter={openNow}
                        onMouseLeave={scheduleClose}
                    >
                        {children}
                    </div>,
                    document.body
                )}
        </span>
    );
}
