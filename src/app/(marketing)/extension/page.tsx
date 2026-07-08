import React from 'react';
import Link from 'next/link';
import c from '@/styles/Content.module.css';
import { pageMetadata } from '@/lib/metadata';

export const generateMetadata = pageMetadata({
    title: 'Browser Extension',
    description:
        'A DoppelShield browser extension is in development: it will check the links you browse for homograph domains on every click, no manual pasting.',
    path: '/extension'
});

const PLANNED = [
    'Checks every link as you browse, with no manual pasting',
    'Warns you the moment a homograph domain shows up',
    'Highlights homoglyphs and surfaces their codepoint and script, right where you hover',
    'Lets you set your own strictness and trusted-domain allowlists'
];

const Extension = () => {
    return (
        <div className={c.page}>
            <h1 className={c.title} data-chunk='1'>
                Protection with{' '}
                <span className={c.titleAccent}>every click</span>.
            </h1>
            <span
                className={c.badge}
                data-chunk='1'
                style={{ ['--ci']: 1 } as React.CSSProperties}
            >
                <span className={c.badgeDot} aria-hidden />
                IN_DEVELOPMENT
            </span>
            <p
                className={c.lead}
                data-chunk='1'
                style={{ ['--ci']: 2 } as React.CSSProperties}
            >
                Today DoppelShield checks the links you paste in. The next step
                brings it into your browser, checking where a link really goes
                before you ever land there. The extension is in development and
                not yet released.
            </p>

            <h2 className={c.h2} data-chunk='2'>
                <span className={c.tick} aria-hidden />
                What is being built
            </h2>
            <div className={c.cardGrid}>
                {PLANNED.map((item, i) => (
                    <div
                        key={item}
                        className={c.card}
                        data-chunk='2'
                        style={{ ['--ci']: i + 1 } as React.CSSProperties}
                    >
                        <span className={c.cardTick} aria-hidden />
                        <div className={c.cardText}>{item}</div>
                    </div>
                ))}
            </div>

            <h2 className={c.h2} data-chunk='3'>
                <span className={c.tick} aria-hidden />
                Want to know when it launches?
            </h2>
            <p
                className={c.prose}
                data-chunk='3'
                style={{ ['--ci']: 1 } as React.CSSProperties}
            >
                Reach out on the{' '}
                <span>
                    <Link href='/contact'>contact page</Link>
                </span>{' '}
                and a note will follow when it launches. Until then, paste any
                link into the <Link href='/'>scanner</Link> and DoppelShield
                will check it right now.
            </p>
        </div>
    );
};

export default Extension;
