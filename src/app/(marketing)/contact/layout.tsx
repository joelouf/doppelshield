import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contact',
    description:
        'Questions, a false positive, or a homograph DoppelShield missed? Get in touch.',
    alternates: { canonical: '/contact' }
};

export default function ContactLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return children;
}
