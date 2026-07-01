'use client';

import { useEffect } from 'react';
import '@/app/globals.css';
import { display, techno, mono } from '@/lib/fonts';
import c from '@/styles/Content.module.css';

// global-error replaces the root layout when the layout itself throws, so it must supply its own html and body and pull in the global styles and font variables the branded classes depend on.
export default function GlobalError({
    error,
    reset
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    // Report here too: a root-layout failure never reaches the segment-level boundary, so without this hook these errors would be entirely silent.
    // console.error is the reporting point until a telemetry service exists.
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html
            lang='en'
            className={`${display.variable} ${techno.variable} ${mono.variable}`}
        >
            <body>
                <div className={c.page}>
                    <h1 className={c.title}>
                        Something{' '}
                        <span className={c.titleAccent}>went wrong</span>.
                    </h1>
                    <p className={c.lead}>
                        An unexpected error interrupted the page.
                    </p>
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
            </body>
        </html>
    );
}
