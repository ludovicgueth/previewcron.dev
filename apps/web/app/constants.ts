// Application constants - centralized configuration values

// CORS Configuration
export const CORS_ALLOWED_ORIGIN = "https://previewcron.dev";

// Local Storage
export const STORAGE_KEY = "previewcron_saved_configs";

// Rate Limiting
export const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60000, // 1 minute
  maxMapSize: 10000, // Safety limit for rate limit map
};

// Request Configuration
export const REQUEST_TIMEOUT_MS = 30000; // 30 seconds
export const MAX_RESPONSE_LENGTH = 1000; // Truncate responses to this length
export const MAX_HEADER_VALUE_LENGTH = 1000;

// Debounce
export const CONFIG_DEBOUNCE_MS = 500;

// Blocked headers that should not be forwarded
export const BLOCKED_HEADERS = [
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "upgrade",
  "proxy-",
  "sec-",
] as const;

// Client-side blocked headers (subset for browser requests)
export const CLIENT_BLOCKED_HEADERS = [
  "host",
  "connection",
  "content-length",
] as const;

// Private IP ranges for SSRF protection
export const PRIVATE_IP_PATTERNS = [
  /^127\./, // 127.0.0.0/8 (localhost)
  /^10\./, // 10.0.0.0/8 (private)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (private)
  /^192\.168\./, // 192.168.0.0/16 (private)
  /^169\.254\./, // 169.254.0.0/16 (link-local)
  /^::1$/, // IPv6 localhost
  /^fc00:/, // IPv6 private
  /^fe80:/, // IPv6 link-local
] as const;

// Header name validation pattern
export const HEADER_NAME_PATTERN = /^[a-z0-9_-]+$/i;

// IPv4 validation pattern
export const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;
