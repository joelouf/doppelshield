"use client";

import { useState, useEffect } from "react";
import Spinner from "@/components/Spinner";
import homepage from "@/styles/css/HomePage.module.css";

const HomePage = () => {
  const [url, setUrl] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (url.trim() === "") {
      setResults([]);
    }
  }, [url]);

  const checkUrl = async () => {
    setIsChecking(true);
    setResults([]);

    if (url.trim() === "") {
      setResults(["Please enter a valid URL."]);
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
      setResults(data.messages);
    } catch (error) {
      setResults(["An error occurred while checking the URL"]);
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
          Enter a URL and check it to see results
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
          <h2>Results:</h2>
          {isChecking ? (
            <p className={homepage.checking}>Checking URL...</p>
          ) : results.length > 0 ? (
            <ul className={homepage.resultList}>
              {results.map((message, index) => (
                <li key={index} className={homepage.resultItem}>
                  {message}
                </li>
              ))}
            </ul>
          ) : (
            <p className={homepage.readyMessage}>Ready to check URLs</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
