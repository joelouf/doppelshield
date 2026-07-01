import type { NextConfig } from 'next';

const securityHeaders = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
    },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' }
];

const apiHeaders = [
    { key: 'Cache-Control', value: 'no-store' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    {
        key: 'Content-Security-Policy',
        value: "default-src 'none'; frame-ancestors 'none'"
    },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'no-referrer' }
];

const nextConfig: NextConfig = {
    output: 'standalone',
    poweredByHeader: false,
    headers() {
        return Promise.resolve([
            { source: '/:path*', headers: securityHeaders },
            { source: '/api/:path*', headers: apiHeaders }
        ]);
    }
};

export default nextConfig;
