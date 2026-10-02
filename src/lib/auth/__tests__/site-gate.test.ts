import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import {
  SITE_COOKIE,
  basicAuthPassword,
  cookieMatches,
  isPublicPath,
  safeNext,
  siteToken,
} from "../siteGate";

const browser = { accept: "text/html", "sec-fetch-mode": "navigate" };

function call(path: string, headers: Record<string, string> = {}, method = "GET") {
  return proxy(new NextRequest(`https://myliquid.test${path}`, { headers, method }));
}

describe("site password", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is off without MYLIQUID_SITE_PASSWORD", () => {
    vi.stubEnv("MYLIQUID_SITE_PASSWORD", "");
    expect(call("/app", browser).headers.get("x-middleware-next")).toBe("1");
  });

  it("sends a browser to the password page, keeping where it was going", () => {
    vi.stubEnv("MYLIQUID_SITE_PASSWORD", "hunter2");
    const res = call("/app/invest?sleeve=index", browser);
    expect(res.status).toBe(307);
    const to = new URL(res.headers.get("location")!);
    expect(to.pathname).toBe("/gate");
    expect(to.searchParams.get("next")).toBe("/app/invest?sleeve=index");
  });

  it("lets a device with the cookie in, and only with the current password's cookie", () => {
    vi.stubEnv("MYLIQUID_SITE_PASSWORD", "hunter2");
    const ok = call("/app", { ...browser, cookie: `${SITE_COOKIE}=${siteToken("hunter2")}` });
    expect(ok.headers.get("x-middleware-next")).toBe("1");
    const stale = call("/app", { ...browser, cookie: `${SITE_COOKIE}=${siteToken("old")}` });
    expect(stale.status).toBe(307);
    expect(cookieMatches(siteToken("hunter2"), "hunter2")).toBe(true);
    expect(cookieMatches("hunter2", "hunter2")).toBe(false);
  });

  it("still accepts HTTP Basic auth, and challenges scripts but not browsers", () => {
    vi.stubEnv("MYLIQUID_SITE_PASSWORD", "hunter2");
    const basic = `Basic ${Buffer.from("me:hunter2").toString("base64")}`;
    expect(call("/api/portfolio", { authorization: basic }).headers.get("x-middleware-next")).toBe(
      "1",
    );
    const script = call("/api/portfolio");
    expect(script.status).toBe(401);
    expect(script.headers.get("www-authenticate")).toContain("Basic");
    const fetched = call("/api/portfolio", { "sec-fetch-mode": "cors" }, "POST");
    expect(fetched.status).toBe(401);
    expect(fetched.headers.get("www-authenticate")).toBeNull();
    expect(basicAuthPassword(basic)).toBe("hunter2");
    expect(basicAuthPassword("Bearer x")).toBeNull();
  });

  it("leaves agent endpoints and the app shell open", () => {
    vi.stubEnv("MYLIQUID_SITE_PASSWORD", "hunter2");
    for (const p of [
      "/api/mcp",
      "/api/agent-identity/enroll",
      "/api/x402/quote",
      "/api/health",
      "/api/cron/traders",
      "/gate",
      "/manifest.webmanifest",
      "/sw.js",
      "/offline",
      "/icons/icon-192.png",
      "/.well-known/assetlinks.json",
    ]) {
      expect(isPublicPath(p), p).toBe(true);
      expect(call(p, browser).headers.get("x-middleware-next"), p).toBe("1");
    }
    for (const p of ["/app", "/gateway", "/api/portfolio", "/offline-data", "/icons"])
      expect(isPublicPath(p), p).toBe(false);
  });

  it("only returns to paths on this site", () => {
    expect(safeNext("/app/pay")).toBe("/app/pay");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext("/gate?next=/app")).toBe("/");
    expect(safeNext(undefined)).toBe("/");
  });
});
