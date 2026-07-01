'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import nav from './Nav.module.css';
import { useEffect, useRef, useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { LinkArrow, linkArrowHost } from './LinkArrow';
import { requestScannerReset } from '@/lib/scannerReset';

const LINKS = [
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
    { href: '/extension', label: 'Extension' }
];

const Nav = () => {
    const pathname = usePathname();
    const [show, setShow] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const scrollYRef = useRef(0);

    useEffect(() => {
        scrollYRef.current = window.scrollY;
        let ticking = false;
        const handleScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const y = window.scrollY;
                const delta = y - scrollYRef.current;
                scrollYRef.current = y;

                if (y < 100 || delta < -6) {
                    setShow(true);
                } else if (delta > 6) {
                    setShow(false);
                    setIsOpen(false);
                }
                ticking = false;
            });
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen]);

    return (
        <nav className={nav.container} data-show={show}>
            <Link
                href='/'
                className={nav.brand}
                aria-label='DoppelShield home'
                onClick={requestScannerReset}
            >
                <span className={nav.mark} aria-hidden>
                    <span className={nav.markPrimary} />
                    <span className={nav.markEcho} />
                </span>
                <span className={nav.word}>
                    DOPPEL<span className={nav.wordEcho}>SHIELD</span>
                </span>
            </Link>

            <div
                id='nav-links'
                className={`${nav.links} ${isOpen ? nav.open : ''}`}
            >
                {LINKS.map(({ href, label }) => {
                    const active = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={nav.link}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => setIsOpen(false)}
                        >
                            {label}
                        </Link>
                    );
                })}
                <Link
                    href='https://github.com/joelouf/doppelshield'
                    target='_blank'
                    rel='noopener noreferrer'
                    className={`${nav.ghost} ${linkArrowHost}`}
                >
                    <span className={nav.ghostInner}>
                        GitHub
                        <LinkArrow />
                    </span>
                </Link>
            </div>

            <button
                className={nav.hamburger}
                onClick={() => setIsOpen((v) => !v)}
                aria-expanded={isOpen}
                aria-controls='nav-links'
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
                {isOpen ? <FaTimes aria-hidden /> : <FaBars aria-hidden />}
            </button>
        </nav>
    );
};

export default Nav;
