import { NextRequest, NextResponse } from "next/server";

// Private IP ranges to block (SSRF protection)
const PRIVATE_IP_RANGES = [
  /^127\./, // 127.0.0.0/8 (localhost)
  /^10\./, // 10.0.0.0/8 (private)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (private)
  /^192\.168\./, // 192.168.0.0/16 (private)
  /^169\.254\./, // 169.254.0.0/16 (link-local)
  /^::1$/, // IPv6 localhost
  /^fc00:/, // IPv6 private
  /^fe80:/, // IPv6 link-local
];

// Rate limiting (in-memory)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_LIMIT_WINDOW = 60000; // 1 minute

function cleanupRateLimitMap() {
  const now = Date.now();
  let cleaned = 0;

  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
      cleaned++;
    }
  }

  // Prevent map from growing too large (safety check)
  if (rateLimitMap.size > 10000) {
    // If map is huge, clear all expired entries more aggressively
    const entries = Array.from(rateLimitMap.entries());
    rateLimitMap.clear();
    // Re-add only non-expired entries
    entries.forEach(([ip, record]) => {
      if (now <= record.resetTime) {
        rateLimitMap.set(ip, record);
      }
    });
  }
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Cleanup old entries periodically (every ~100 requests)
  if (rateLimitMap.size > 0 && Math.random() < 0.01) {
    cleanupRateLimitMap();
  }

  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow http and https
    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }

    // Block localhost and variants
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("127.") ||
      hostname === "[::1]" ||
      hostname === "[::]"
    ) {
      return false;
    }

    // Block all IP addresses (IPv4)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(hostname)) {
      return false; // Block all IP addresses, not just private ones
    }

    // Block private IP ranges (catches edge cases)
    for (const range of PRIVATE_IP_RANGES) {
      if (range.test(hostname)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

function validateHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const blockedHeaders = [
    "host",
    "connection",
    "content-length",
    "transfer-encoding",
    "upgrade",
    "proxy-",
    "sec-",
  ];

  const validated: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();

    // Block sensitive headers
    if (blockedHeaders.some((blocked) => lowerKey.startsWith(blocked))) {
      continue;
    }

    // Validate header name (alphanumeric, hyphens, underscores)
    if (!/^[a-z0-9_-]+$/i.test(key)) {
      continue;
    }

    // Limit header value length
    if (value.length > 1000) {
      continue;
    }

    validated[key] = value;
  }

  return validated;
}

export async function POST(request: NextRequest) {
  // Rate limiting - extract first IP from x-forwarded-for (handles multiple IPs)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  // x-forwarded-for can contain: "client, proxy1, proxy2"
  const ip = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : realIp || "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      {
        success: false,
        message: "Rate limit exceeded. Please try again later.",
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { url, headers } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, message: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL (SSRF protection)
    if (!isValidUrl(url)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid or blocked URL. Only public HTTP/HTTPS URLs are allowed.",
        },
        { status: 400 }
      );
    }

    // Validate and sanitize headers
    const validatedHeaders = headers ? validateHeaders(headers) : {};

    // Set timeout (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: validatedHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const statusCode = response.status;
      const isSuccess = statusCode >= 200 && statusCode < 300;

      let message = "";
      try {
        const data = await response.text();
        message = data.substring(0, 1000);
      } catch {
        message = `Response received with status ${statusCode}`;
      }

      return NextResponse.json({
        success: isSuccess,
        message: isSuccess ? `Success: ${message}` : `Error: ${message}`,
        statusCode,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            message: "Request timeout (30s)",
            statusCode: 408,
          },
          { status: 408 }
        );
      }

      throw fetchError;
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to trigger cron job",
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
