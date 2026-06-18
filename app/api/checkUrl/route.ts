import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import net from "node:net";

const MAX_REDIRECTS = 3;

function prefixUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `http://${url}`;
  }
  return url;
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

async function normalizeAndValidateUrl(input: string): Promise<string> {
  const candidate = prefixUrl(input);
  const parsed = new URL(candidate);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only HTTP(S) URLs are allowed");
  }

  const host = parsed.hostname;
  const directType = net.isIP(host);
  if (directType === 4 && isPrivateIPv4(host)) {
    throw new Error("Private or loopback IPv4 addresses are not allowed");
  }
  if (directType === 6 && isPrivateIPv6(host)) {
    throw new Error("Private or loopback IPv6 addresses are not allowed");
  }

  if (directType === 0) {
    const resolved = await lookup(host, { all: true });
    if (
      resolved.some((entry) =>
        entry.family === 4 ? isPrivateIPv4(entry.address) : isPrivateIPv6(entry.address)
      )
    ) {
      throw new Error("Resolved host points to a private or loopback address");
    }
  }

  return parsed.toString();
}

async function expandUrl(url: string): Promise<{ expanded: string }> {
  try {
    const safeUrl = await normalizeAndValidateUrl(url);
    const response = await fetch(safeUrl, {
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

  const { expanded: expandedUrl } = await expandUrl(url);
  const prefixedUrl = prefixUrl(expandedUrl);

  let safeUrl: string;
  try {
    safeUrl = await normalizeAndValidateUrl(prefixedUrl);
  } catch {
    resultMessages.push("Error: URL is unreachable or invalid");
    return resultMessages;
  }

  resultMessages.push(`URL expanded to ${expandedUrl}`);

  const cyrillicRegex = /[\u0400-\u04FF]/;

  if (cyrillicRegex.test(safeUrl)) {
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
    const response = await fetch(safeUrl, {
      method: "GET",
      redirect: "manual"
    });

    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.has("location")
    ) {
      const redirectedUrl = response.headers.get("location")!;
      const absoluteRedirect = new URL(redirectedUrl, safeUrl).toString();
      await normalizeAndValidateUrl(absoluteRedirect);
      return checkRedirects(absoluteRedirect, redirectCount + 1);
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

  if (typeof url !== "string" || url.trim() === "") {
    return NextResponse.json(
      { messages: ["Error: URL is unreachable or invalid"] },
      { status: 400 }
    );
  }

  try {
    await normalizeAndValidateUrl(url);
  } catch {
    return NextResponse.json(
      { messages: ["Error: URL is unreachable or invalid"] },
      { status: 400 }
    );
  }

  const results = await checkRedirects(url);
  return NextResponse.json({ messages: results });
}
