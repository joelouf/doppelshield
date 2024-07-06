"use client";

import Link from "next/link";
import nav from "@/styles/css/Nav.module.css";
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";

const Nav = () => {
  const [show, setShow] = useState(true);
  const scrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShow(currentScrollY < scrollYRef.current || currentScrollY < 100);
      scrollYRef.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const guestLinks = [
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" }
  ];

  return (
    <nav
      className={nav.container}
      style={{
        position: "sticky",
        top: "0",
        width: "100%",
        zIndex: "1",
        transition: "transform 0.4s ease-in-out",
        transform: show ? "translateY(0)" : "translateY(-150px)"
      }}
    >
      <Link href='/'>
        <Image
          width={50}
          height={50}
          src='/doppelshield-logo-white-transparent.svg'
          alt='DoppelShield logo'
        />
      </Link>

      <div className={nav.tabsContainer}>
        {guestLinks.map(({ href, label }) => (
          <Link key={uuidv4()} href={href} className={nav.tab}>
            {label}
          </Link>
        ))}

        <Link href='/extension' className={nav.extensionButton}>
          Browser Extension
        </Link>
      </div>
    </nav>
  );
};

export default Nav;
