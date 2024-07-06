"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FaInstagram,
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
              onClick={() => toggleSection("company")}
            >
              <h3>
                Company
                {openSections.includes("company") ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </h3>
            </div>
            {openSections.includes("company") && (
              <ul>
                <li>
                  <Link href='/about'>About</Link>
                </li>
                <li>
                  <Link href='/careers'>Careers</Link>
                </li>
                <li>
                  <Link href='/blog'>Blog</Link>
                </li>
              </ul>
            )}
          </div>
          <div className={footer.footerSection}>
            <div
              className={footer.sectionHeader}
              onClick={() => toggleSection("services")}
            >
              <h3>
                Services
                {openSections.includes("services") ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </h3>
            </div>
            {openSections.includes("services") && (
              <ul>
                <li>
                  <Link href='/property-management'>Property Management</Link>
                </li>
                <li>
                  <Link href='/tenant-screening'>Tenant Screening</Link>
                </li>
                <li>
                  <Link href='/maintenance'>Maintenance</Link>
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
                  <Link href='/faq'>FAQ</Link>
                </li>
                <li>
                  <Link href='/guides'>Guides</Link>
                </li>
                <li>
                  <Link href='/support'>Support</Link>
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
            <Link href='https://www.instagram.com/jlouf' target='_blank'>
              <FaInstagram />
            </Link>
            <Link
              href='https://www.linkedin.com/in/joemmaalouf'
              target='_blank'
            >
              <FaLinkedinIn />
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
