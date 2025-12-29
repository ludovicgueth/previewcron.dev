import {
  HEADER_NAME_PATTERN,
  MAX_HEADER_VALUE_LENGTH,
  CLIENT_BLOCKED_HEADERS,
  BLOCKED_HEADERS,
} from "../constants";

export interface ParsedHeaders {
  headers: Record<string, string>;
  errors: string[];
}

/**
 * Parse custom headers from a multiline string format.
 * Each line should be in the format: "Header-Name: header value"
 *
 * @param input - Multiline string with headers
 * @returns Parsed headers object
 */
export function parseCustomHeaders(input: string): ParsedHeaders {
  const headers: Record<string, string> = {};
  const errors: string[] = [];

  if (!input || !input.trim()) {
    return { headers, errors };
  }

  const lines = input.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const colonIndex = trimmedLine.indexOf(":");
    if (colonIndex <= 0) {
      errors.push(`Invalid format: "${trimmedLine}" (missing colon)`);
      continue;
    }

    const key = trimmedLine.substring(0, colonIndex).trim();
    const value = trimmedLine.substring(colonIndex + 1).trim();

    if (!key) {
      errors.push(`Empty header name in line: "${trimmedLine}"`);
      continue;
    }

    if (!value) {
      errors.push(`Empty value for header: "${key}"`);
      continue;
    }

    if (!HEADER_NAME_PATTERN.test(key)) {
      errors.push(
        `Invalid header name: "${key}" (only alphanumeric, hyphens, underscores allowed)`
      );
      continue;
    }

    headers[key] = value;
  }

  return { headers, errors };
}

/**
 * Validate and filter headers for client-side requests (browser fetch).
 * Blocks sensitive headers that shouldn't be sent from the client.
 *
 * @param headers - Headers object to validate
 * @returns Validated headers with blocked headers removed
 */
export function validateClientHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const validated: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();

    // Skip blocked headers
    const isBlocked = CLIENT_BLOCKED_HEADERS.some((blocked) =>
      lowerKey.startsWith(blocked)
    );
    if (isBlocked) continue;

    // Validate header name
    if (!HEADER_NAME_PATTERN.test(key)) continue;

    validated[key] = value;
  }

  return validated;
}

/**
 * Validate and filter headers for server-side proxy requests.
 * More restrictive than client-side, blocks additional sensitive headers.
 *
 * @param headers - Headers object to validate
 * @returns Validated headers with blocked headers removed
 */
export function validateServerHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const validated: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();

    // Skip blocked headers (more restrictive list)
    const isBlocked = BLOCKED_HEADERS.some((blocked) =>
      lowerKey.startsWith(blocked)
    );
    if (isBlocked) continue;

    // Validate header name
    if (!HEADER_NAME_PATTERN.test(key)) continue;

    // Limit header value length
    if (value.length > MAX_HEADER_VALUE_LENGTH) continue;

    validated[key] = value;
  }

  return validated;
}

/**
 * Parse and validate custom headers in one step for client-side use.
 * Combines parsing from string and validation.
 *
 * @param input - Multiline string with headers
 * @returns Validated headers ready for fetch
 */
export function parseAndValidateClientHeaders(
  input: string
): Record<string, string> {
  const { headers } = parseCustomHeaders(input);
  return validateClientHeaders(headers);
}
