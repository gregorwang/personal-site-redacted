const FORBIDDEN_RETURN_PREFIXES = ["/api/auth", "/auth/sign-out"];

export function getSafeReturnTo(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://local.invalid");
    const path = `${url.pathname}${url.search}${url.hash}`;

    if (FORBIDDEN_RETURN_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
      return fallback;
    }

    return path;
  } catch {
    return fallback;
  }
}

export function withLoginSuccessMarker(returnTo: string) {
  const safeReturnTo = getSafeReturnTo(returnTo);
  const url = new URL(safeReturnTo, "https://local.invalid");
  url.searchParams.set("login", "success");
  return `${url.pathname}${url.search}${url.hash}`;
}
