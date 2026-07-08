import c from '@/styles/Content.module.css';
import { pageMetadata } from '@/lib/metadata';

export const generateMetadata = pageMetadata({
    title: 'What Is a Homograph Attack?',
    description:
        'A homograph attack swaps Latin letters for look-alike Cyrillic or Greek characters to forge a trusted domain. How it works and how DoppelShield detects it.',
    path: '/about'
});

const About = () => {
    return (
        <div className={c.page}>
            <h1 className={c.title} data-chunk='1'>
                <div>
                    When they go <span className={c.titleAccent}>rogue</span>,
                </div>
                <div>
                    you stay <span className={c.titleAccent}>ready</span>.
                </div>
            </h1>
            <p
                className={c.lead}
                data-chunk='1'
                style={{ ['--ci']: 1 } as React.CSSProperties}
            >
                DoppelShield is a URL forensics tool for spotting look-alike
                domains. Enter a link and it decodes the host, flags any
                Cyrillic or Greek homoglyphs, follows redirects safely, and
                tells you whether the domain resolves at all.
            </p>

            <h2 className={c.h2} data-chunk='2'>
                <span className={c.tick} aria-hidden />
                What is a homograph attack?
            </h2>
            <p
                className={c.prose}
                data-chunk='2'
                style={{ ['--ci']: 1 } as React.CSSProperties}
            >
                Many Cyrillic and Greek letters are near-perfect twins of Latin
                ones: Cyrillic <code>а</code>
                <code>е</code>
                <code>о</code>
                <code>р</code>
                <code>с</code> read as <code>a</code>
                <code>e</code>
                <code>o</code>
                <code>p</code>
                <code>c</code>, Greek <code>α</code>
                <code>ο</code> as <code>a</code>
                <code>o</code>. An attacker registers <code>раypal.com</code>{' '}
                (with a Cyrillic <strong>р</strong> and <strong>а</strong>) and,
                to the eye, it is indistinguishable from <code>paypal.com</code>
                . The browser, however, connects to a completely different
                domain.
            </p>

            <h2 className={c.h2} data-chunk='3'>
                <span className={c.tick} aria-hidden />
                How DoppelShield works
            </h2>
            <ul className={c.list}>
                <li
                    className={c.listItem}
                    data-chunk='3'
                    style={{ ['--ci']: 1 } as React.CSSProperties}
                >
                    <b>Decode the host</b>: The host is converted from its ASCII
                    A-label (the IDNA <code>xn--</code> ACE form) back to
                    Unicode, then scanned for characters from the Cyrillic and
                    Greek scripts, the ones most often confusable with Latin
                    letters.
                </li>
                <li
                    className={c.listItem}
                    data-chunk='3'
                    style={{ ['--ci']: 2 } as React.CSSProperties}
                >
                    <b>Per-character evidence</b>: Each flagged character is
                    isolated and tagged with its exact Unicode codepoint and
                    script, so you see precisely what is impersonating what.
                </li>
                <li
                    className={c.listItem}
                    data-chunk='3'
                    style={{ ['--ci']: 3 } as React.CSSProperties}
                >
                    <b>Safe redirect tracing</b>: Redirects are followed one hop
                    at a time, each re-validated, up to a fixed limit. Loop
                    detection and a wall-clock deadline keep the trace bounded.
                </li>
                <li
                    className={c.listItem}
                    data-chunk='3'
                    style={{ ['--ci']: 4 } as React.CSSProperties}
                >
                    <b>Connect-time SSRF guard</b>: The server resolves and pins
                    the exact IP it connects to, blocking loopback, private, and
                    cloud-metadata ranges. DNS-rebinding and
                    redirect-to-internal attacks can&apos;t slip through.
                </li>
                <li
                    className={c.listItem}
                    data-chunk='3'
                    style={{ ['--ci']: 5 } as React.CSSProperties}
                >
                    <b>No information disclosure</b>: Blocked and unresponsive
                    targets return one uniform verdict, so the tool can never be
                    used to map an internal network.
                </li>
            </ul>

            <h2 id='limitations' className={c.h2} data-chunk='4'>
                <span className={c.tick} aria-hidden />
                Limitations
            </h2>
            <p
                className={c.prose}
                data-chunk='4'
                style={{ ['--ci']: 1 } as React.CSSProperties}
            >
                DoppelShield focuses on script-based homoglyphs (Cyrillic and
                Greek) and structural red flags. It is not a malware scanner or
                a reputation service: a domain can be entirely Latin and still
                be malicious. Treat a clean result as{' '}
                <strong>&ldquo;no homoglyphs detected,&rdquo;</strong> not{' '}
                <strong>&ldquo;safe&rdquo;</strong>. Always verify before
                entering sensitive information.
            </p>

            <h2 id='privacy' className={c.h2} data-chunk='5'>
                <span className={c.tick} aria-hidden />
                Privacy &amp; acceptable use
            </h2>
            <p
                className={c.prose}
                data-chunk='5'
                style={{ ['--ci']: 1 } as React.CSSProperties}
            >
                DoppelShield needs no account and does not store the URLs you
                submit. Each scan runs in memory and is discarded once the
                response is sent; server logs keep only a request id and the
                outcome, never the URL, its query string, or your IP address.
                The link you enter is fetched from DoppelShield&apos;s server,
                not your browser, so the destination site sees the scanner
                rather than you. Please submit only URLs you have a legitimate
                reason to inspect.
            </p>
        </div>
    );
};

export default About;
