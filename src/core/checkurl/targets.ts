import { asciiSkeleton } from './confusables';
import { TOP_BRAND_TARGETS } from './data/brandTargets.generated';

const SEED_TARGETS: ReadonlyArray<string> = [
    'paypal.com',
    'microsoft.com',
    'apple.com',
    'icloud.com',
    'google.com',
    'amazon.com',
    'facebook.com',
    'instagram.com',
    'whatsapp.com',
    'netflix.com',
    'linkedin.com',
    'outlook.com',
    'office.com',
    'chase.com',
    'bankofamerica.com',
    'wellsfargo.com',
    'citibank.com',
    'americanexpress.com',
    'dhl.com',
    'fedex.com',
    'usps.com',
    'ups.com',
    'coinbase.com',
    'binance.com',
    'steamcommunity.com',
    'discord.com',
    'adobe.com',
    'dropbox.com',
    'github.com',
    'spotify.com',
    'ebay.com',
    'walmart.com',
    'roblox.com',
    'twitter.com',
    'tiktok.com',
    'snapchat.com',
    'reddit.com',
    'yahoo.com',
    'hsbc.com',
    'santander.com'
];

function sldToken(domain: string): string {
    return domain.split('.')[0] ?? domain;
}

export const BRAND_TARGETS: ReadonlyArray<string> = (() => {
    const seen = new Set<string>();
    const merged: string[] = [];

    for (const domain of [...SEED_TARGETS, ...TOP_BRAND_TARGETS]) {
        const token = sldToken(domain);

        if (seen.has(token)) continue;

        seen.add(token);
        merged.push(domain);
    }

    return merged;
})();

const TOKEN_TO_DOMAIN: ReadonlyMap<string, string> = new Map(
    BRAND_TARGETS.map((domain) => [sldToken(domain), domain])
);

export function matchTarget(hostname: string): string | null {
    const host = hostname
        .replace(/^\[|\]$/g, '')
        .replace(/\.$/, '')
        .toLowerCase();

    for (const label of host.split('.')) {
        const skeleton = asciiSkeleton(label);

        if (skeleton === label) continue;

        const domain = TOKEN_TO_DOMAIN.get(skeleton);

        if (domain) return domain;
    }

    return null;
}
