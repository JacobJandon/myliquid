import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * The optional site password (MYLIQUID_SITE_PASSWORD) for private deployments. Browsers get a password page
 * (`/gate`) that leaves a long-lived cookie, so the installed app asks once per device; scripts can still send
 * the password with HTTP Basic auth (any user name). Pure helpers, shared by `src/proxy.ts` and the gate route.
 */

export const SITE_COOKIE = "ml_site";
export const SITE_COOKIE_MAX_AGE = 90 * 24 * 60 * 60;

/**
 * Paths that never ask for the site password.
 * - Agent endpoints authenticate with an API key or a one-time invite, which only a signed-in investor can create.
 * - The daily cron job checks CRON_SECRET.
 * - The app shell (manifest, icons, service worker, offline page, Android asset links) holds no account data, and
 *   Android and Chrome fetch it without cookies when they install the app.
 */
const PUBLIC_PREFIXES = [
  "/api/mcp",
  "/api/agent-identity",
  "/api/x402/",
  "/api/health",
  "/api/cron/",
  "/api/site-gate",
  "/gate",
  "/manifest.webmanifest",
  "/sw.js",
  "/offline",
  "/icons/",
  "/screenshots/",
  "/apple-icon.png",
  "/.well-known/assetlinks.json",
];

export function isPublicPath(path: string): boolean {
  return PUBLIC_PREFIXES.some((p) =>
    p.endsWith("/") ? path.startsWith(p) : path === p || path.startsWith(`${p}/`),
  );
}

/** The cookie value for a password. Changing the password signs every device out. */
export function siteToken(password: string): string {
  return createHmac("sha256", password).update("myliquid-site-gate-v1").digest("hex");
}

function sameSecret(a: string, b: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}

export function passwordMatches(supplied: string | null | undefined, password: string): boolean {
  return typeof supplied === "string" && sameSecret(supplied, password);
}

export function cookieMatches(value: string | null | undefined, password: string): boolean {
  return typeof value === "string" && sameSecret(value, siteToken(password));
}

/** The password from an `Authorization: Basic …` header, or null. */
export function basicAuthPassword(header: string | null): string | null {
  if (!header?.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  return colon === -1 ? null : decoded.slice(colon + 1);
}

/** Where to go after the gate: a path on this site, never another origin. */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.startsWith("/gate") || next.startsWith("/api/") || /[\\\r\n]/.test(next)) return "/";
  return next;
}

export function secureCookies(): boolean {
  if (process.env.MYLIQUID_COOKIE_SECURE) return process.env.MYLIQUID_COOKIE_SECURE === "true";
  return process.env.NODE_ENV === "production";
}
