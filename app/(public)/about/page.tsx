import React from "react";
import about from "@/styles/css/About.module.css";

const About = () => {
  return (
    <div className={about.container}>
      <h1 className={about.heading}>About DoppelShield</h1>
      <p className={about.description}>
        DoppelShield is a tool designed to protect users from homograph attacks
        and misleading URLs. It detects and exposes URLs that contain Cyrillic
        characters, which are often used by malicious actors to trick users into
        visiting deceptive websites.
      </p>

      <h2 className={about.subheading}>What are Homograph Attacks?</h2>
      <p className={about.description}>
        Homograph/Homoglyph attacks exploit the visual similarity between
        characters from different alphabets to create misleading URLs. Cyrillic
        characters are particularly favored by attackers because many of them
        closely resemble Latin characters. By replacing Latin characters with
        visually similar Cyrillic characters, attackers can create URLs that
        appear legitimate but lead to malicious websites.
      </p>

      <p className={about.description}>
        DoppelShield aims to combat these attacks by providing a user-friendly
        tool that quickly identifies the presence of Cyrillic characters in
        URLs. By raising awareness about homograph attacks and offering a
        reliable detection mechanism, DoppelShield empowers users to browse the
        web with greater confidence and security.
      </p>

      <h2 className={about.subheading}>How DoppelShield Works</h2>
      <ul className={about.list}>
        <li>
          URL Expansion: When a URL is entered, DoppelShield starts by expanding
          the URL to ensure that any redirects are followed, and the final
          destination URL is obtained.
        </li>
        <br />
        <li>
          Cyrillic Character Detection: After expanding the URL, DoppelShield
          uses a regular expression (regex) to check for the presence of
          Cyrillic characters in the expanded URL. The specific regex used is{" "}
          <code>/[\u0400-\u04FF]/</code>, which matches any character in the
          Cyrillic Unicode range. If Cyrillic characters are found, a warning
          message is added to the result messages.
        </li>
        <br />
        <li>
          Redirect Limit Check: DoppelShield keeps track of the number of
          redirects encountered during the URL expansion process. If the number
          of redirects exceeds the specified maximum limit (3), a warning
          message is added to the result messages.
        </li>
        <br />
        <li>
          HTTP Response Check: DoppelShield sends a request to the original URL
          which allows it to inspect the HTTP response status code. If the
          status code indicates a redirect (status code between 300 and 399) and
          the location header is present, DoppelShield recursively calls the
          function with the redirected URL and an incremented redirect count.
        </li>
      </ul>

      <h2 className={about.subheading}>Limitations</h2>
      <p className={about.description}>
        While DoppelShield is highly effective at detecting Cyrillic characters
        in URLs, it&apos;s important to note that it does not check for other
        types of homograph attacks or misleading URLs. Users should still
        exercise caution and verify the legitimacy of websites before entering
        sensitive information.
      </p>
    </div>
  );
};

export default About;
