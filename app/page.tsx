"use client";

import { useState, useEffect } from "react";
import Spinner from "@/components/Spinner";
import homepage from "@/styles/css/HomePage.module.css";

const HomePage = () => {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("Ready to check URLs.");
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (url.trim() === "") {
      setResult("Ready to check URLs.");
    }
  }, [url]);

  const checkUrl = async () => {
    setIsChecking(true);
    setResult(""); // Clear previous result

    if (url.trim() === "") {
      setResult("Please enter a valid URL.");
      setIsChecking(false);
      return;
    }

    try {
      const response = await fetch("/api/checkUrl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      setResult(data.message);
    } catch (error) {
      setResult("An error occurred while checking the URL.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className={homepage.container}>
      <header className={homepage.header}>
        <h1>DoppelShield</h1>
        <p>Expose URL Lookalikes</p>
      </header>
      <main className={homepage.main}>
        <p className={homepage.instructions}>
          Enter a URL and check it to see results.
        </p>
        <div className={homepage.inputGroup}>
          <input
            className={homepage.input}
            type='text'
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder='Enter URL'
            disabled={isChecking}
          />
          <button
            className={`${homepage.ctaButton} ${
              isChecking ? homepage.disabled : ""
            }`}
            onClick={checkUrl}
            disabled={isChecking}
          >
            {isChecking ? <Spinner /> : "Check URL"}
          </button>
        </div>
        <div className={homepage.resultContainer}>
          <h2>Result:</h2>
          <p className={homepage.result}>
            {isChecking ? "Checking URL..." : result}
          </p>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
