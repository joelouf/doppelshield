import { NextResponse } from "next/server";

const MAX_REDIRECTS = 5;

async function checkRedirects(
  url: string,
  redirectCount: number = 0
): Promise<string> {
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  if (/^http:\/\//i.test(url)) {
    return "Warning: The URL uses HTTP, which is not secure. Consider using HTTPS instead.";
  }

  const cyrillicRegex = /[\u0400-\u04FF]/;

  const validUrlRegex = /^[a-z0-9!@#$%^&*()_+\-=`~\[\]\\{}|;':",./<>?]+$/i;

  if (cyrillicRegex.test(url)) {
    return `Warning: URL contains Cyrillic characters`;
  }

  if (!validUrlRegex.test(url)) {
    return `Warning: URL contains invalid characters`;
  }

  if (redirectCount >= MAX_REDIRECTS) {
    return `Warning: Maximum number of redirects (${MAX_REDIRECTS}) reached`;
  }

  try {
    const response = await fetch(url, {
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

    if (response.ok) {
      return "URL appears safe.";
    } else {
      return `Error: Received status code ${response.status} (${response.statusText})`;
    }
  } catch (error) {
    console.error("Error checking URL:", error);
    return "Error: URL is unreachable or invalid";
  }
}

export async function POST(request: Request) {
  const { url } = await request.json();

  const result = await checkRedirects(url);
  return NextResponse.json({ message: result });
}
