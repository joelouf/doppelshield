import { pageMetadata } from '@/lib/metadata';

export const generateMetadata = pageMetadata({
    title: 'Contact',
    description:
        'Questions, a false positive, or a homograph DoppelShield missed? Get in touch.',
    path: '/contact'
});

export default function ContactLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return children;
}
