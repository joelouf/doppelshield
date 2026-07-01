const NATIVE_SCRIPT_TLDS: ReadonlyArray<{
    script: string;
    tlds: ReadonlyArray<string>;
}> = [
    { script: 'Greek', tlds: ['gr', 'ελ'] },
    {
        script: 'Cyrillic',
        tlds: [
            'ru',
            'рф',
            'su',
            'by',
            'бел',
            'ua',
            'укр',
            'bg',
            'бг',
            'mk',
            'мкд',
            'rs',
            'срб',
            'mn',
            'kz',
            'қаз',
            'kg',
            'tj'
        ]
    },
    { script: 'Armenian', tlds: ['am', 'հայ'] },
    { script: 'Georgian', tlds: ['ge', 'გე'] },
    { script: 'Hebrew', tlds: ['il', 'ישראל'] },
    {
        script: 'Arabic',
        tlds: [
            'sa',
            'السعودية',
            'ir',
            'ایران',
            'eg',
            'مصر',
            'ae',
            'امارات',
            'qa',
            'قطر',
            'iq',
            'jo',
            'sy',
            'سورية',
            'ye',
            'om',
            'kw',
            'bh',
            'dz',
            'الجزائر',
            'ma',
            'المغرب',
            'tn',
            'تونس',
            'ps',
            'فلسطين',
            'pk',
            'پاکستان',
            'af'
        ]
    }
];

const TLD_TO_SCRIPTS = new Map<string, string[]>();
for (const { script, tlds } of NATIVE_SCRIPT_TLDS) {
    for (const tld of tlds) {
        const existing = TLD_TO_SCRIPTS.get(tld) ?? [];
        existing.push(script);
        TLD_TO_SCRIPTS.set(tld, existing);
    }
}

export function nativeScriptsForTld(tld: string): readonly string[] {
    return TLD_TO_SCRIPTS.get(tld.toLowerCase()) ?? [];
}
