import { NextResponse } from "next/server";
import { tooManyAttempts } from "@/lib/auth/rateLimit";
import {
  SITE_COOKIE,
  SITE_COOKIE_MAX_AGE,
  passwordMatches,
  safeNext,
  secureCookies,
  siteToken,
} from "@/lib/auth/siteGate";

/** The password page posts here: a right password leaves the device cookie and goes on to the app. */
export async function POST(req: Request) {
  const password = process.env.MYLIQUID_SITE_PASSWORD;
  const form = await req.formData().catch(() => null);
  const next = safeNext(form?.get("next"));
  const back = (error: string) => {
    const url = new URL("/gate", req.url);
    url.searchParams.set("next", next);
    url.searchParams.set("error", error);
    return NextResponse.redirect(url, 303);
  };
  if (!password) return NextResponse.redirect(new URL(next, req.url), 303);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "local";
  if (tooManyAttempts(`site-gate:${ip}`)) return back("slow");
  const supplied = form?.get("password");
  if (!passwordMatches(typeof supplied === "string" ? supplied : null, password))
    return back("wrong");

  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(SITE_COOKIE, siteToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    maxAge: SITE_COOKIE_MAX_AGE,
  });
  return res;
}
