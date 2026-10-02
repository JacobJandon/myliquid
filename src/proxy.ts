import { NextResponse, type NextRequest } from "next/server";
import {
  SITE_COOKIE,
  basicAuthPassword,
  cookieMatches,
  isPublicPath,
  passwordMatches,
} from "@/lib/auth/siteGate";

/**
 * Optional site password for private deployments. With MYLIQUID_SITE_PASSWORD set, every page and API asks for it
 * before the app's own sign-in: browsers are sent to the password page (`/gate`), which remembers the device;
 * scripts can send it with HTTP Basic auth (any user name). Agent endpoints, the cron job and the app shell stay
 * open (see `isPublicPath`).
 */
export function proxy(req: NextRequest) {
  const password = process.env.MYLIQUID_SITE_PASSWORD;
  if (!password) return NextResponse.next();
  const path = req.nextUrl.pathname;
  if (isPublicPath(path)) return NextResponse.next();
  if (cookieMatches(req.cookies.get(SITE_COOKIE)?.value, password)) return NextResponse.next();
  if (passwordMatches(basicAuthPassword(req.headers.get("authorization")), password))
    return NextResponse.next();

  const navigation =
    (req.method === "GET" || req.method === "HEAD") &&
    (req.headers.get("sec-fetch-mode") === "navigate" ||
      (req.headers.get("accept") ?? "").includes("text/html"));
  if (navigation) {
    const gate = new URL("/gate", req.url);
    gate.searchParams.set("next", path + req.nextUrl.search);
    return NextResponse.redirect(gate);
  }
  // Browsers (which send Sec-Fetch-Mode) get no Basic challenge, so a background request never pops a dialog.
  return new NextResponse("MyLiquid is private. Enter the site password to continue.", {
    status: 401,
    headers: req.headers.get("sec-fetch-mode")
      ? {}
      : { "WWW-Authenticate": 'Basic realm="MyLiquid", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
