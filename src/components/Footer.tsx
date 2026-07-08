import Link from 'next/link';
import { FaEnvelope, FaLinkedinIn, FaGithub } from 'react-icons/fa';
import footer from './Footer.module.css';

const NAV = [
    { href: '/', label: 'Scanner' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
    { href: '/extension', label: 'Extension' }
];

const Footer = () => {
    return (
        <footer className={footer.footer}>
            <div className={footer.container}>
                <div className={footer.top}>
                    <div className={footer.brandCol}>
                        <Link
                            href='/'
                            className={footer.brand}
                            aria-label='DoppelShield home'
                        >
                            <span className={footer.mark} aria-hidden />
                            <span className={footer.word}>
                                DOPPEL
                                <span className={footer.wordEcho}>SHIELD</span>
                            </span>
                        </Link>
                        <p className={footer.tagline}>
                            Unmask deceptive domains.
                        </p>
                    </div>

                    <nav className={footer.nav} aria-label='Footer'>
                        <span className={footer.navLabel}>NAVIGATE</span>
                        {NAV.map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                className={footer.navLink}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className={footer.bottom}>
                    <p className={footer.copy}>© 2026 DoppelShield</p>
                    <div className={footer.social}>
                        <Link
                            href='https://github.com/joelouf/doppelshield'
                            target='_blank'
                            rel='noopener noreferrer'
                            title='joelouf/doppelshield'
                            aria-label='GitHub'
                        >
                            <FaGithub aria-hidden />
                        </Link>
                        <Link
                            href='https://www.linkedin.com/in/joelouf'
                            target='_blank'
                            rel='noopener noreferrer'
                            title='/in/joelouf'
                            aria-label='LinkedIn'
                        >
                            <FaLinkedinIn aria-hidden />
                        </Link>
                        <Link
                            href='mailto:contact@doppelshield.com'
                            title='contact@doppelshield.com'
                            aria-label='Email'
                        >
                            <FaEnvelope aria-hidden />
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
