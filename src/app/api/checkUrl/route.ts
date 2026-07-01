import {
    createCheckUrlHandler,
    methodNotAllowed
} from '@/core/checkurl/handler';

// Each scan resolves and reaches a live host, so the response must never be cached or prerendered.
// maxDuration caps the request to bound the outbound fetch the SSRF guard performs.
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export const POST = createCheckUrlHandler();
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
