declare module 'punycode/' {
    export function toUnicode(domain: string): string;
    export function toASCII(domain: string): string;
}
