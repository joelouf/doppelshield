'use client';

import { useEffect } from 'react';
import c from '@/styles/Content.module.css';

export default function Error({
    error,
    reset
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    // Surface the error so production failures are not silent.
    // This app ships no telemetry service, so console.error is the reporting hook point.
    // Swap for logger call (with error.digest as correlation id) if added later.
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className={c.page}>
            <h1 className={c.title}>
                Something <span className={c.titleAccent}>went wrong</span>.
            </h1>
            <p className={c.lead}>An unexpected error interrupted the page.</p>
            {error.digest && (
                <p className={c.prose}>Reference: {error.digest}</p>
            )}
            <p className={c.prose}>
                <button
                    type='button'
                    onClick={reset}
                    className={c.actionButton}
                >
                    TRY AGAIN
                </button>
            </p>
        </div>
    );
}
