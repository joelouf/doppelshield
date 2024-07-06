"use client";

import { useState } from "react";
import homepage from "@/styles/css/HomePage.module.css";

const HomePage = () => {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");

  const checkUrl = async () => {
    if (url.trim() === "") {
      setResult("Please enter a valid URL.");
      return;
    }

    const response = await fetch("/api/checkUrl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    const data = await response.json();
    setResult(data.message);
  };

  return (
    <section className={homepage.container}>
      <h1 className={homepage.header}>DoppelShield</h1>
      <p className={homepage.body}>Expose URL Lookalikes</p>
      <input
        type='text'
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder='Enter URL'
      />
      <button className={homepage.ctaButton} onClick={checkUrl}>
        Check URL
      </button>
      <p>{result}</p>
    </section>
  );
};

export default HomePage;
