export const SCANNER_RESET_EVENT = 'doppelshield:scanner-reset';

export function requestScannerReset(): void {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new Event(SCANNER_RESET_EVENT));
}
