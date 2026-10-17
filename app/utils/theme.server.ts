import { createCookie } from "react-router";

export type Theme = "light" | "dark";

function getThemeCookie(request?: Request) {
  const secure = request ? new URL(request.url).protocol === "https:" : false;

  return createCookie("theme", {
    maxAge: 31_536_000,
    httpOnly: false,
    secure,
    sameSite: "lax",
  });
}

export async function getTheme(request: Request): Promise<Theme> {
  const themeCookie = getThemeCookie(request);
  const cookieHeader = request.headers.get("Cookie");
  const theme = await themeCookie.parse(cookieHeader);
  return theme === "dark" ? "dark" : "light";
}

export async function setTheme(theme: Theme, request?: Request) {
  const themeCookie = getThemeCookie(request);
  return themeCookie.serialize(theme);
}
