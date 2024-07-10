# DoppelShield
[![License Badge](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

DoppelShield is a web application that protects users from homograph attacks and misleading URLs. It detects and exposes URLs that contain Cyrillic characters, which are often used by malicious actors to trick users into visiting deceptive websites.

## Table of Contents

- [DoppelShield](#doppelshield)
  - [Features](#features)
  - [Technologies Used](#technologies-used)
  - [Getting Started](#getting-started)
  - [Usage](#usage)
  - [Contact](#contact)
  - [License](#license)

## Features

- Detects Cyrillic characters in URLs
- Follows redirects to ensure the final destination URL is checked
- Provides warnings for URLs containing Cyrillic characters
- Checks URL validity and maximum number of redirects
- User-friendly interface for easy URL checking
- API endpoint for programmatic access

## Technologies Used

- React
- Next.js
- TypeScript
- CSS Modules
- Formspree (for contact form)

## Getting Started

To run the DoppelShield application locally, follow these steps:

1. Clone the repository.
2. Navigate to the project directory.
3. Install the dependencies.
4. Start the development server.
5. Open your browser and visit the specified URL to see the application running.

## Usage

1. On the homepage, enter a URL into the input field and click the "Check URL" button.
2. DoppelShield will expand the URL, follow any redirects, and check for the presence of Cyrillic characters.
3. The results will be displayed below the input field, indicating whether Cyrillic characters were found and any other relevant warnings.

## Contact

If you have any questions, suggestions, or feedback, please feel free to reach out to us via the contact form on our website or by emailing [joem3847@gmail.com](mailto:joem3847@gmail.com).

## License

This project is licensed under the MIT License.
