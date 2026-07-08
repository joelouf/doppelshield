import { describe, it, expect } from 'vitest';
import type { ResolvingMetadata } from 'next';
import { brandTitle, pageMetadata } from './metadata';

type ResolvedParent = Awaited<ResolvingMetadata>;

const hashedImage = {
    url: 'https://doppelshield.com/opengraph-image?abc123',
    width: 1200,
    height: 630,
    alt: 'DoppelShield - a flagged homograph scan result',
    type: 'image/png'
};

const parentWith = (overrides: object) =>
    Promise.resolve(overrides as ResolvedParent);

const generate = pageMetadata({
    title: 'Contact',
    description: 'Get in touch.',
    path: '/contact'
});

describe('brandTitle', () => {
    it('suffixes the brand the same way the layout template does', () => {
        expect(brandTitle('%s')).toBe('%s / DoppelShield');
    });
});

describe('pageMetadata', () => {
    const parent = parentWith({
        openGraph: { images: [hashedImage] },
        twitter: { images: [hashedImage] }
    });

    it('keeps the bare title so the layout template can suffix the brand', async () => {
        const meta = await generate(undefined, parent);
        expect(meta.title).toBe('Contact');
    });

    it('sets a self-referencing canonical for the page path', async () => {
        const meta = await generate(undefined, parent);
        expect(meta.alternates?.canonical).toBe('/contact');
    });

    it('gives OpenGraph the page url and the fully composed title', async () => {
        const meta = await generate(undefined, parent);
        expect(meta.openGraph?.url).toBe('/contact');
        expect(meta.openGraph?.title).toBe('Contact / DoppelShield');
        expect(meta.openGraph?.description).toBe('Get in touch.');
        expect(meta.openGraph?.siteName).toBe('DoppelShield');
    });

    it('mirrors the composed title and description onto the Twitter card', async () => {
        const meta = await generate(undefined, parent);
        expect(meta.twitter?.title).toBe('Contact / DoppelShield');
        expect(meta.twitter?.description).toBe('Get in touch.');
    });

    it('reuses the parent resolved images so the hashed OG image URL survives', async () => {
        const meta = await generate(undefined, parent);
        expect(meta.openGraph?.images).toEqual([hashedImage]);
        expect(meta.twitter?.images).toEqual([hashedImage]);
    });

    it('reuses the parent OG images for Twitter when the parent resolves no Twitter images', async () => {
        const meta = await generate(
            undefined,
            parentWith({ openGraph: { images: [hashedImage] } })
        );
        expect(meta.twitter?.images).toEqual([hashedImage]);
    });

    it('falls back to the static OG image when the parent resolves none', async () => {
        const meta = await generate(undefined, parentWith({}));
        const fallback = {
            url: '/opengraph-image',
            width: 1200,
            height: 630,
            alt: 'DoppelShield - a flagged homograph scan result'
        };
        expect(meta.openGraph?.images).toEqual([fallback]);
        expect(meta.twitter?.images).toEqual([fallback]);
    });
});
