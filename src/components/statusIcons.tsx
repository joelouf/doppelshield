import type { ReactNode } from 'react';

type IconProps = { size?: number };

function Svg({
    size = 13,
    width,
    children
}: IconProps & { width: number; children: ReactNode }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox='0 0 14 14'
            fill='none'
            stroke='currentColor'
            strokeWidth={width}
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden
        >
            {children}
        </svg>
    );
}

export function IconClear({ size }: IconProps) {
    return (
        <Svg size={size} width={1.0}>
            <path d='M2.5 7.5 5.7 10.6 11.5 3.4' />
        </Svg>
    );
}

export function IconReview({ size }: IconProps) {
    return (
        <Svg size={size} width={1.0}>
            <circle cx='5.8' cy='5.8' r='3.4' />
            <path d='M8.5 8.5 12 12' />
        </Svg>
    );
}

export function IconFlagged({ size }: IconProps) {
    return (
        <Svg size={size} width={1.0}>
            <path d='M7 2.7 12.2 11.7 1.8 11.7Z' />
            <path d='M7 5.7 7 8.35' />
            <circle
                cx='7'
                cy='10.5'
                r='0.85'
                fill='currentColor'
                stroke='none'
            />
        </Svg>
    );
}

export function IconIndeterminate({ size }: IconProps) {
    return (
        <Svg size={size} width={1.0}>
            <path d='M2.5 7 11.5 7' />
        </Svg>
    );
}

function IconLock({ size }: IconProps) {
    return (
        <Svg size={size} width={1.0}>
            <path d='M3.4 6.6 H10.6 V11.7 H3.4 Z' />
            <path d='M5 6.6 V4.9 a2 2 0 0 1 4 0 V6.6' />
        </Svg>
    );
}

function IconLockOpen({ size }: IconProps) {
    return (
        <Svg size={size} width={1.0}>
            <path d='M3.4 6.6 H10.6 V11.7 H3.4 Z' />
            <path d='M5 6.6 V4.3 a2.3 2.3 0 0 1 4.6 -0.5' />
        </Svg>
    );
}

export function IconInfo({ size }: IconProps) {
    return (
        <Svg size={size} width={1.0}>
            <circle cx='7' cy='7' r='5.4' />
            <path d='M7 6.4 V9.7' />
            <circle
                cx='7'
                cy='4.3'
                r='0.55'
                fill='currentColor'
                stroke='none'
            />
        </Svg>
    );
}

export function IconArrowUpRight({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            width='1em'
            height='1em'
            viewBox='0 0 14 14'
            fill='none'
            stroke='currentColor'
            strokeWidth={1.5}
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden
        >
            <path d='M4.2 9.8 9.8 4.2' />
            <path d='M4.2 4.2 H9.8 V9.8' />
        </svg>
    );
}

export function toneIcon(tone: string): ReactNode {
    if (tone === 'flagged') return <IconFlagged />;
    if (tone === 'review') return <IconReview />;
    if (tone === 'clear') return <IconClear />;

    return <IconIndeterminate />;
}

export function transportIcon(state: string): ReactNode {
    if (state === 'secure') return <IconLock />;
    if (state === 'unverified') return <IconIndeterminate />;

    return <IconLockOpen />;
}
