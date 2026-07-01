import type { Metadata } from 'next';
import { connection } from 'next/server';
import EntranceGuard from '@/components/EntranceGuard';
import Footer from '@/components/Footer';
import Nav from '@/components/Nav';
import '@/app/globals.css';
import layout from './layout.module.css';
import { display, techno, mono } from '@/lib/fonts';
import { SITE_URL } from '@/lib/site';

const title = 'DoppelShield · URL Forensics & Homograph Scanner';
const description =
    'URL forensics tool that decodes the host, flags look-alike characters, and traces the redirect chain to surface homograph attacks.';

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: title,
        template: '%s · DoppelShield'
    },
    description,
    applicationName: 'DoppelShield',
    alternates: {
        canonical: '/'
    },
    openGraph: {
        type: 'website',
        siteName: 'DoppelShield',
        title,
        description,
        url: '/'
    },
    twitter: {
        card: 'summary_large_image',
        title,
        description
    }
};

export default async function RootLayout({
    children
}: {
    children: React.ReactNode;
}) {
    // Force dynamic rendering so each document is built per request.
    // A prerendered shell would carry a stale nonce that the live CSP rejects.
    await connection();
    return (
        <html
            lang='en'
            className={`${display.variable} ${techno.variable} ${mono.variable}`}
        >
            <body>
                <EntranceGuard />
                <div className={layout.frame}>
                    <Nav />
                    <main>{children}</main>
                </div>
                <Footer />
            </body>
        </html>
    );
}
