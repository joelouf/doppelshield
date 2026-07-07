import s from './Chevron.module.css';

export type ChevronDirection = 'up' | 'down' | 'left' | 'right';

export function Chevron({
    direction = 'right',
    className
}: {
    direction?: ChevronDirection;
    className?: string;
}) {
    return (
        <span
            className={className ? `${s.chevron} ${className}` : s.chevron}
            data-direction={direction}
            aria-hidden
        >
            <svg
                width='0.9em'
                height='0.9em'
                viewBox='0 0 14 14'
                fill='none'
                stroke='currentColor'
                strokeWidth={1.4}
                strokeLinecap='round'
                strokeLinejoin='round'
            >
                <path d='M5.25 3.5 8.75 7 5.25 10.5' />
            </svg>
        </span>
    );
}
