"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FaEnvelope,
  FaLinkedinIn,
  FaChevronDown,
  FaChevronUp,
  FaGithub
} from "react-icons/fa";
import footer from "@/styles/css/Footer.module.css";

const Footer = () => {
  const [openSections, setOpenSections] = useState<string[]>([]);

  const toggleSection = (section: string) => {
    setOpenSections((prevOpenSections) => {
      if (prevOpenSections.includes(section)) {
        return prevOpenSections.filter((s) => s !== section);
      } else {
        return [...prevOpenSections, section];
      }
    });
  };

  return (
    <footer className={footer.footer}>
      <div className={footer.container}>
        <div className={footer.footerContent}>
          <div className={footer.footerSection}>
            <div
              className={footer.sectionHeader}
              onClick={() => toggleSection("about")}
            >
              <h3>
                About
                {openSections.includes("about") ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </h3>
            </div>
            {openSections.includes("about") && (
              <ul>
                <li>
                  <Link href='/about'>Our Mission</Link>
                </li>
                <li>
                  <Link href='/team'>Our Team</Link>
                </li>
                <li>
                  <Link href='/contact'>Contact Us</Link>
                </li>
              </ul>
            )}
          </div>
          <div className={footer.footerSection}>
            <div
              className={footer.sectionHeader}
              onClick={() => toggleSection("features")}
            >
              <h3>
                Features
                {openSections.includes("features") ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </h3>
            </div>
            {openSections.includes("features") && (
              <ul>
                <li>
                  <Link href='/url-check'>URL Check</Link>
                </li>
                <li>
                  <Link href='/extension'>Browser Extension</Link>
                </li>
                <li>
                  <Link href='/api-docs'>API Documentation</Link>
                </li>
              </ul>
            )}
          </div>
          <div className={footer.footerSection}>
            <div
              className={footer.sectionHeader}
              onClick={() => toggleSection("resources")}
            >
              <h3>
                Resources
                {openSections.includes("resources") ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </h3>
            </div>
            {openSections.includes("resources") && (
              <ul>
                <li>
                  <Link href='/blog'>Blog</Link>
                </li>
                <li>
                  <Link href='/faq'>FAQ</Link>
                </li>
                <li>
                  <Link href='/security-tips'>Security Tips</Link>
                </li>
              </ul>
            )}
          </div>
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
