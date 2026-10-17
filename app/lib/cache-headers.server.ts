import type { HeadersFunction } from "react-router";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
} as const;

export const JSON_NO_STORE_HEADERS = {
  ...NO_STORE_HEADERS,
  "Content-Type": "application/json",
} as const;

export const TOKEN_DATA_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=300",
} as const;

export const JSON_TOKEN_DATA_CACHE_HEADERS = {
  ...TOKEN_DATA_CACHE_HEADERS,
  "Content-Type": "application/json",
} as const;

/** Remix v3_singleFetch: loader Cache-Control must be forwarded via route headers for document responses. */
export const forwardLoaderCacheControl: HeadersFunction = ({ loaderHeaders }) => {
  const cacheControl = loaderHeaders.get("Cache-Control");
  if (!cacheControl) return {};
  const headers: Record<string, string> = { "Cache-Control": cacheControl };
  const vary = loaderHeaders.get("Vary");
  if (vary) headers.Vary = vary;
  return headers;
};
