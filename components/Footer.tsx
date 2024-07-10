"use client";

import React from "react";
import Link from "next/link";
import { FaEnvelope, FaLinkedinIn, FaGithub } from "react-icons/fa";
import footer from "@/styles/css/Footer.module.css";

const Footer = () => {
  return (
    <footer className={footer.footer}>
      <div className={footer.container}>
        <div className={footer.footerContent}>
          <p className={footer.specialThanks}>
            Thank you to Professor Skinner and Ben Piehler for their guidance
            and support in bringing DoppelShield to life
          </p>
        </div>
        <div className={footer.footerBottom}>
          <p>&copy; 2024 DoppelShield</p>

          <span className={footer.socialIcons}>
            <Link href='https://github.com/jmlouf' target='_blank'>
              <FaGithub />
            </Link>
            <Link
              href='https://www.linkedin.com/in/joemmaalouf'
              target='_blank'
            >
              <FaLinkedinIn />
            </Link>
            <Link href='mailto:joem3847@gmail.com'>
              <FaEnvelope />
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
