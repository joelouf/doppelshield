import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'DoppelShield / URL Forensics & Homograph Detection',
        short_name: 'DoppelShield',
        description:
            'URL forensics tool that decodes the host, flags look-alike characters, and traces the redirect chain to surface homograph attacks.',
        start_url: '/',
        display: 'standalone',
        background_color: '#080a07',
        theme_color: '#080a07',
        icons: [
            {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png'
            },
            {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png'
            }
        ]
    };
}
