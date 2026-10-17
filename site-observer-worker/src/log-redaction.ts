const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const IPV4_PATTERN =
  /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const IPV6_PATTERN =
  /(?<![0-9a-f:])(?:(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:){1,7}:|(?:[0-9a-f]{1,4}:){1,6}:[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:){1,5}(?::[0-9a-f]{1,4}){1,2}|(?:[0-9a-f]{1,4}:){1,4}(?::[0-9a-f]{1,4}){1,3}|(?:[0-9a-f]{1,4}:){1,3}(?::[0-9a-f]{1,4}){1,4}|(?:[0-9a-f]{1,4}:){1,2}(?::[0-9a-f]{1,4}){1,5}|[0-9a-f]{1,4}:(?:(?::[0-9a-f]{1,4}){1,6})|:(?:(?::[0-9a-f]{1,4}){1,7}|:))(?![0-9a-f:])/gi;
const AUTH_PATTERN =
  /\b(?:bearer|authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|password|cookie|secret)\b\s*[:=]\s*["']?[^\s,"'}]+/gi;
const BEARER_PATTERN = /\bbearer\s+["']?[^\s,"'}]+/gi;
const LONG_TOKEN_PATTERN = /\b[A-Za-z0-9+/_=-]{32,}\b/g;
const URL_PATTERN = /https?:\/\/[^\s)"'}]+/gi;

function stripUrlQuery(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return rawUrl.split(/[?#]/, 1)[0] ?? rawUrl;
  }
}

export function sanitizeLogText(
  input: string,
  maximumLength = 600,
): string {
  return input
    .replace(URL_PATTERN, stripUrlQuery)
    .replace(BEARER_PATTERN, "[redacted-credential]")
    .replace(AUTH_PATTERN, "[redacted-credential]")
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(IPV6_PATTERN, "[redacted-ip]")
    .replace(IPV4_PATTERN, "[redacted-ip]")
    .replace(LONG_TOKEN_PATTERN, "[redacted-token]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

export function sanitizeRoute(input: string | null): string | null {
  if (!input) {
    return null;
  }

  try {
    const parsed = new URL(input);
    return parsed.pathname.slice(0, 240);
  } catch {
    const path = input.split(/[?#]/, 1)[0]?.trim();
    return path ? path.slice(0, 240) : null;
  }
}

export function normalizeFingerprintText(input: string): string {
  const normalizedIdentifiers = input
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      "<uuid>",
    )
    .replace(/\b\d{3,}\b/g, "<number>")
    .replace(/0x[0-9a-f]+/gi, "<hex>");
  return sanitizeLogText(normalizedIdentifiers, 400)
    .toLowerCase()
    .trim();
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
