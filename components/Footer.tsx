'use client';

import React from 'react';
import Link from 'next/link';
import { FaEnvelope, FaLinkedinIn, FaGithub } from 'react-icons/fa';
import footer from '@/styles/css/Footer.module.css';

const Footer = () => {
    return (
        <footer className={footer.footer}>
            <div className={footer.container}>
                <div className={footer.footerContent}>
                    <p className={footer.specialThanks}>
                        Thank you to Professor Skinner and Ben Piehler for their
                        guidance and support in bringing DoppelShield to life
                    </p>
                </div>
                <div className={footer.footerBottom}>
                    <p>&copy; 2026 DoppelShield</p>

                    <span className={footer.socialIcons}>
                        <Link href='https://github.com/joelouf' target='_blank'>
                            <FaGithub />
                        </Link>
                        <Link
                            href='https://www.linkedin.com/in/joelouf'
                            target='_blank'
                        >
                            <FaLinkedinIn />
                        </Link>
                        <Link href='mailto:contact@joelouf.com'>
                            <FaEnvelope />
                        </Link>
                    </span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
