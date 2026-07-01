import Link from 'next/link';
import c from '@/styles/Content.module.css';

export default function NotFound() {
    return (
        <div className={c.page}>
            <h1 className={c.title}>
                Page <span className={c.titleAccent}>not found</span>.
            </h1>
            <p className={c.lead}>
                The page you're looking for doesn't exist or has moved.
            </p>
            <p className={c.prose}>
                <Link href='/'>Back to the scanner</Link>
            </p>
        </div>
    );
}
