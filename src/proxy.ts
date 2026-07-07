import { NextResponse, type NextRequest } from 'next/server';
import { buildContentSecurityPolicy } from './lib/csp';

export function proxy(request: NextRequest): NextResponse {
    // Fresh per request so a leaked nonce never authorizes a later response.
    // Strict-dynamic in the policy means only scripts carrying this value run.
    const nonce = btoa(crypto.randomUUID());
    const csp = buildContentSecurityPolicy(nonce, {
        isDev: process.env.NODE_ENV === 'development'
    });

    const requestHeaders = new Headers(request.headers);
    // Next's CSP: The nonce goes on the request inside the policy, where the framework extracts the 'nonce-' value to stamp its own scripts, and as x-nonce, which a server component can read via headers() to nonce a next/script.
    // The policy on the response is what the browser enforces.
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);

    const response = NextResponse.next({
        request: { headers: requestHeaders }
    });
    response.headers.set('Content-Security-Policy', csp);
    return response;
}

export const config = {
    matcher: [
        {
            // Document responses get the nonce policy.
            // Static assets and the API carry no inline scripts, and prefetches reuse the served document, so a per-prefetch nonce would mismatch on navigation.
            source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
            missing: [
                { type: 'header', key: 'next-router-prefetch' },
                { type: 'header', key: 'purpose', value: 'prefetch' }
            ]
        }
    ]
};
