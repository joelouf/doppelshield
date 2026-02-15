<section id="title">
  <img src="./public/doppelshield-banner.svg" alt="DoppelShield Banner" width="100%">
</section>

<section id="badges" align="center">

[![License Badge](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

</section>

<br />

<section id="description">
  <p>
    A web application designed to detect and expose homograph attacks, where deceptive URLs use visually similar characters from non-Latin scripts to impersonate legitimate domains. DoppelShield analyzes URLs for Cyrillic character substitutions, follows redirect chains, and flags lookalike domains before users interact with them. Built with Next.js and TypeScript, it provides both a user-facing interface and an API endpoint for programmatic URL analysis.
  </p>
</section>

<hr />

<details open>
  <summary style="overflow: hidden; cursor: pointer; margin-top: 4rem;">
    <h2 style="display: inline;">&nbsp;&thinsp;Table of Contents</h2>
  </summary>

  <nav style="margin-top: 0.6rem">
    <ol type="I">
      <li><a href="#features">Features</a></li>
      <li><a href="#tools--technologies">Tools & Technologies</a></li>
      <li><a href="#getting-started">Getting Started</a></li>
      <li><a href="#usage">Usage</a>
      <li><a href="#license">License</a></li>
      <li><a href="#contact">Contact</a></li>
    </ol>
  </nav>
</details>

<br />

<h2 id="features">Features</h2>

<ul>
  <li>Detects Cyrillic characters in URLs</li>
  <li>Follows redirects to ensure the final destination URL is checked</li>
  <li>Provides warnings for URLs containing Cyrillic characters</li>
  <li>Checks URL validity and maximum number of redirects</li>
  <li>User-friendly interface for easy URL checking</li>
</ul>

<br />

<h2 id="tools--technologies">Tools & Technologies</h2>

<ul>
  <li>React</li>
  <li>Next.js</li>
  <li>TypeScript</li>
  <li>CSS Modules</li>
  <li>Formspree</li>
</ul>

<br />

<h2 id="getting-started">Getting Started</h2>

<p>To run the DoppelShield application locally, follow these steps:</p>

<ol>
  <li>Clone the repository</li>
  <li>Navigate to the project directory</li>
  <li>Install the dependencies</li>
  <li>Start the development server</li>
  <li>Open your browser and visit the specified URL to see the application running</li>
</ol>

<br />

<h2 id="usage">Usage</h2>

<ul>
  <li>On the homepage, enter a URL into the input field and click the "Check URL" button</li>
  <li>DoppelShield will expand the URL, follow any redirects, and check for the presence of Cyrillic characters</li>
  <li>The results will be displayed below the input field, indicating whether Cyrillic characters were found and any other relevant warnings</li>
</ul>

<br />

<h2 id="license">License</h2>

<p>This project is licensed under the <b><a href="https://opensource.org/licenses/mit">MIT License</a></b>. For more details regarding rights and limitations, see <a href="./LICENSE">LICENSE</a>.</p>

<br />

<h2 id="contact">Contact</h2>

<h3>Joe Maalouf</h3>
<address style="display: flex; justify-content: flex-start; list-style-type: none;">
  <a href="https://github.com/joelouf" title="GitHub: @joelouf" target="_blank"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" height="32" alt="github.com/joelouf" /></a>&ensp;<a href="https://linkedin.com/in/joelouf" title="LinkedIn: /in/joelouf" target="_blank"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge" height="32" alt="linkedin.com/in/joelouf" /></a>
</address>

<br />
<br />
<hr />

<p align="right"><a href="#title">Back to top ↑</a></p>
