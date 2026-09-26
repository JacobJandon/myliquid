import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optional site password for private test deployments. With MYLIQUID_SITE_PASSWORD
 * set, every page and API asks for it (HTTP Basic auth, any user name) before the
 * app's own sign-in. Endpoints that connected agents call with an API key are left
 * open, since the key is the credential there and only a signed-in investor can
 * create one.
 */

const AGENT_ENDPOINTS = ["/api/mcp", "/api/agent-identity", "/api/x402/", "/api/health"];

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function suppliedPassword(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  return colon === -1 ? null : decoded.slice(colon + 1);
}

export function proxy(req: NextRequest) {
  const password = process.env.MYLIQUID_SITE_PASSWORD;
  if (!password) return NextResponse.next();
  const path = req.nextUrl.pathname;
  if (AGENT_ENDPOINTS.some((p) => path === p || (p.endsWith("/") && path.startsWith(p))))
    return NextResponse.next();
  const supplied = suppliedPassword(req);
  if (supplied !== null && timingSafeEqual(digest(supplied), digest(password)))
    return NextResponse.next();
  return new NextResponse("MyLiquid is private. Enter the site password to continue.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="MyLiquid", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
