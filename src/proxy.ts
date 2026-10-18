import { NextResponse, type NextRequest } from "next/server";
import { VISITOR_COOKIE, VISITOR_MAX_AGE } from "@/lib/analytics/constants";
import { shouldTrack } from "@/lib/domain/analytics";
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
  if (!password) return withVisitor(req);
  const path = req.nextUrl.pathname;
  if (isPublicPath(path)) return withVisitor(req);
  if (cookieMatches(req.cookies.get(SITE_COOKIE)?.value, password)) return withVisitor(req);
  if (passwordMatches(basicAuthPassword(req.headers.get("authorization")), password))
    return withVisitor(req);

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

/**
 * Lets the request through, giving a new visitor a random first-party id (`ml_vid`) for MyLiquid's own analytics,
 * on pages only, and never to bots or visitors who opted out (Global Privacy Control, Do Not Track). The page being
 * rendered sees the id at once.
 */
function withVisitor(req: NextRequest): NextResponse {
  const page =
    req.method === "GET" &&
    !req.nextUrl.pathname.startsWith("/api/") &&
    (req.headers.get("accept") ?? "").includes("text/html");
  if (
    !page ||
    req.cookies.has(VISITOR_COOKIE) ||
    !shouldTrack({
      userAgent: req.headers.get("user-agent"),
      gpc: req.headers.get("sec-gpc"),
      dnt: req.headers.get("dnt"),
    })
  )
    return NextResponse.next();
  const id = crypto.randomUUID();
  const forwarded = new Headers(req.headers);
  const cookie = forwarded.get("cookie");
  forwarded.set("cookie", `${cookie ? `${cookie}; ` : ""}${VISITOR_COOKIE}=${id}`);
  const res = NextResponse.next({ request: { headers: forwarded } });
  res.cookies.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: VISITOR_MAX_AGE,
  });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
