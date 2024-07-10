import React from "react";
import extension from "@/styles/css/Extension.module.css";

const Extension = () => {
  return (
    <div className={extension.container}>
      <h1 className={extension.heading}>Browser Extension</h1>
      <p className={extension.description}>
        DoppelShield browser extension coming soon! With the extension,
        you&apos;ll be able to seamlessly check URLs for potential homograph
        attacks and misleading characters directly from your browser.
      </p>
      <div className={extension.features}>
        <h2 className={extension.subheading}>Key Features:</h2>
        <ul className={extension.featureList}>
          <li>Real-time URL scanning</li>
          <li>Instant alerts for suspicious URLs</li>
          <li>Easy-to-use interface</li>
          <li>Customizable settings</li>
        </ul>
      </div>
    </div>
  );
};

export default Extension;
