import { NextResponse } from "next/server";

const MAX_REDIRECTS = 3;

function prefixUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `http://${url}`;
  }
  return url;
}

async function expandUrl(url: string): Promise<{ expanded: string }> {
  try {
    const prefixedUrl = prefixUrl(url);
    const response = await fetch(prefixedUrl, {
      method: "GET",
      redirect: "follow"
    });
    return {
      expanded: response.url
    };
  } catch (error) {
    console.error("Error expanding URL:", error);
    return { expanded: url };
  }
}

async function checkRedirects(
  url: string,
  redirectCount: number = 0
): Promise<string[]> {
  let resultMessages: string[] = [];

  const prefixedUrl = prefixUrl(url);
  const { expanded: expandedUrl } = await expandUrl(prefixedUrl);

  resultMessages.push(`URL expanded to ${expandedUrl}`);

  const cyrillicRegex = /[\u0400-\u04FF]/;

  if (cyrillicRegex.test(expandedUrl)) {
    resultMessages.push(`Warning: URL contains Cyrillic characters`);
  } else {
    resultMessages.push(`No Cyrillic characters found in the URL`);
  }

  if (redirectCount >= MAX_REDIRECTS) {
    resultMessages.push(
      `Warning: Maximum number of redirects (${MAX_REDIRECTS}) reached`
    );
  }

  try {
    const response = await fetch(prefixedUrl, {
      method: "GET",
      redirect: "manual"
    });

    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.has("location")
    ) {
      const redirectedUrl = response.headers.get("location")!;
      return checkRedirects(redirectedUrl, redirectCount + 1);
    }

    if (!response.ok) {
      resultMessages.push(
        `URL returned status code ${response.status} (${response.statusText})`
      );
    }
  } catch (error) {
    console.error("Error checking URL:", error);
    resultMessages.push("Error: URL is unreachable or invalid");
  }

  return resultMessages;
}

export async function POST(request: Request) {
  const { url } = await request.json();

  const results = await checkRedirects(url);
  return NextResponse.json({ messages: results });
}
