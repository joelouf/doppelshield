import { Chakra_Petch, JetBrains_Mono, Electrolize } from 'next/font/google';

export const display = Electrolize({
    subsets: ['latin'],
    weight: ['400'],
    variable: '--font-display',
    display: 'swap'
});

export const techno = Chakra_Petch({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-techno',
    display: 'swap'
});

export const mono = JetBrains_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '700'],
    variable: '--font-mono',
    display: 'swap'
});
