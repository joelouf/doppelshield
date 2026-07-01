'use client';

import { useId, useState, type ReactNode } from 'react';
import s from './CollapsibleSection.module.css';
import { Chevron } from './Chevron';

export interface CollapsibleSectionProps {
    title: ReactNode;
    aside?: ReactNode;
    defaultOpen?: boolean;
    collapsible?: boolean;
    children: ReactNode;
}

export function CollapsibleSection({
    title,
    aside,
    defaultOpen,
    collapsible = true,
    children
}: CollapsibleSectionProps) {
    const id = useId();
    const [open, setOpen] = useState(!!defaultOpen);
    if (!collapsible) {
        return (
            <section className={s.section}>
                <div className={s.heading}>
                    <span className={s.title}>{title}</span>
                    {aside && <span className={s.aside}>{aside}</span>}
                </div>
                {children}
            </section>
        );
    }
    return (
        <section className={`${s.section} ${open ? s.open : ''}`}>
            <div className={s.header}>
                <button
                    type='button'
                    className={s.toggle}
                    aria-expanded={open}
                    aria-controls={id}
                    onClick={() => setOpen((o) => !o)}
                >
                    <Chevron direction={open ? 'down' : 'right'} />
                    <span className={s.title}>{title}</span>
                </button>
                {aside && <span className={s.aside}>{aside}</span>}
            </div>
            {/* Collapsed body stays mounted for a CSS height transition. */}
            {/* Inert pulls it out of focus order and the accessibility tree so hidden controls are not tabbable. */}
            <div id={id} className={s.collapsible} inert={!open}>
                <div className={s.collapsibleInner}>
                    <div className={s.collapsibleBody}>{children}</div>
                </div>
            </div>
        </section>
    );
}
