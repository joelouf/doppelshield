import type { Metadata, ResolvingMetadata } from 'next';
import { SITE_NAME } from '@/lib/site';

export const OG_IMAGE_ALT = 'DoppelShield - a flagged homograph scan result';
export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

export const brandTitle = (title: string) => `${title} / ${SITE_NAME}`;

const fallbackImage = {
    url: '/opengraph-image',
    ...OG_IMAGE_SIZE,
    alt: OG_IMAGE_ALT
};

export function pageMetadata({
    title,
    description,
    path
}: {
    title: string;
    description: string;
    path: string;
}) {
    return async function generateMetadata(
        _props: unknown,
        parent: ResolvingMetadata
    ): Promise<Metadata> {
        const resolved = await parent;
        const fullTitle = brandTitle(title);
        const images = resolved.openGraph?.images ?? [fallbackImage];
        return {
            title,
            description,
            alternates: { canonical: path },
            openGraph: {
                type: 'website',
                siteName: SITE_NAME,
                title: fullTitle,
                description,
                url: path,
                images
            },
            twitter: {
                card: 'summary_large_image',
                title: fullTitle,
                description,
                images: resolved.twitter?.images ?? images
            }
        };
    };
}
