import {
    createCheckUrlHandler,
    methodNotAllowed
} from '@/core/checkurl/handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export const POST = createCheckUrlHandler();
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
