import { NextRequest, NextResponse } from "next/server";
import {
  RATE_LIMIT,
  REQUEST_TIMEOUT_MS,
  MAX_RESPONSE_LENGTH,
  MAX_HEADER_VALUE_LENGTH,
  PRIVATE_IP_PATTERNS,
  IPV4_PATTERN,
} from "../../constants";

// Rate limiting (in-memory)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function cleanupRateLimitMap() {
  const now = Date.now();

  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }

  // Prevent map from growing too large (safety check)
  if (rateLimitMap.size > RATE_LIMIT.maxMapSize) {
    const entries = Array.from(rateLimitMap.entries());
    rateLimitMap.clear();
    // Re-add only non-expired entries
    for (const [ip, record] of entries) {
      if (now <= record.resetTime) {
        rateLimitMap.set(ip, record);
      }
    }
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
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
    return true;
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
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
    if (IPV4_PATTERN.test(hostname)) {
      return false;
    }

    // Block private IP ranges (catches edge cases)
    for (const range of PRIVATE_IP_PATTERNS) {
      if (range.test(hostname)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/** Returns the trimmed value if it is a usable header value, undefined otherwise. */
function sanitizeHeaderValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_HEADER_VALUE_LENGTH) return undefined;
  // Header values must not contain CR/LF (header injection)
  if (/[\r\n]/.test(trimmed)) return undefined;
  return trimmed;
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
    const body: Record<string, unknown> = await request.json();
    const { url, authHeader, bypassToken } = body;

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

    // Only two headers are ever forwarded, built server-side. Arbitrary
    // custom headers were dropped on purpose in 0.3: Authorization is
    // Vercel's own cron auth pattern, and a fixed allow-list removes the
    // header-injection surface entirely.
    const headers: Record<string, string> = {};
    const auth = sanitizeHeaderValue(authHeader);
    if (auth) headers["Authorization"] = auth;
    const bypass = sanitizeHeaderValue(bypassToken);
    if (bypass) headers["x-vercel-protection-bypass"] = bypass;

    // Set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const statusCode = response.status;
      const isSuccess = statusCode >= 200 && statusCode < 300;

      let message = "";
      try {
        const data = await response.text();
        message = data.substring(0, MAX_RESPONSE_LENGTH);
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
            message: `Request timeout (${REQUEST_TIMEOUT_MS / 1000}s)`,
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
