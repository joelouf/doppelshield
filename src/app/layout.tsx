import type { Metadata } from 'next';
import { connection } from 'next/server';
import EntranceGuard from '@/components/EntranceGuard';
import Footer from '@/components/Footer';
import Nav from '@/components/Nav';
import '@/app/globals.css';
import layout from './layout.module.css';
import { display, techno, mono } from '@/lib/fonts';
import { brandTitle } from '@/lib/metadata';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const title = 'DoppelShield / URL Forensics & Homograph Detection';
const description =
    'URL forensics tool that decodes the host, flags look-alike characters, and traces the redirect chain to surface homograph attacks.';

const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: SITE_URL,
            name: SITE_NAME,
            publisher: { '@id': `${SITE_URL}/#author` }
        },
        {
            '@type': 'WebApplication',
            '@id': `${SITE_URL}/#app`,
            name: SITE_NAME,
            url: SITE_URL,
            description,
            applicationCategory: 'SecurityApplication',
            image: `${SITE_URL}/icons/icon-512.png`,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            sameAs: ['https://github.com/joelouf/doppelshield'],
            author: { '@id': `${SITE_URL}/#author` }
        },
        {
            '@type': 'Person',
            '@id': `${SITE_URL}/#author`,
            name: 'Joe Maalouf',
            url: 'https://github.com/joelouf',
            sameAs: ['https://www.linkedin.com/in/joelouf']
        }
    ]
};

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: title,
        template: brandTitle('%s')
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
    await connection();
    return (
        <html
            lang='en'
            className={`${display.variable} ${techno.variable} ${mono.variable}`}
        >
            <body>
                <script
                    type='application/ld+json'
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c')
                    }}
                />
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
