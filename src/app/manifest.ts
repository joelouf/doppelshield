import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'DoppelShield / URL Forensics & Homograph Scanner',
        short_name: 'DoppelShield',
        description:
            'URL forensics tool that decodes the host, flags look-alike characters, and traces the redirect chain to surface homograph attacks.',
        start_url: '/',
        display: 'standalone',
        background_color: '#080a07',
        theme_color: '#080a07',
        icons: [
            {
                src: '/logo.png',
                sizes: 'any',
                type: 'image/png'
            }
        ]
    };
}
