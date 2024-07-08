"use client";

import React, { useState } from "react";
import Link from "next/link";
import styles from "@/styles/css/Banner.module.css";

const Banner = () => {
  const [showBanner, setShowBanner] = useState(true);

  if (!showBanner) return null;

  return (
    <div className={styles.banner}>
      <p>
        Learn about DoppelShield&apos;s capabilities and limitations in the{" "}
        <Link href='/about' className={styles.bannerLink}>
          About
        </Link>{" "}
        section.
      </p>
      <button
        onClick={() => setShowBanner(false)}
        className={styles.bannerClose}
      >
        ×
      </button>
    </div>
  );
};

export default Banner;
