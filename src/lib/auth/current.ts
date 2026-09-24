import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { findInvestor, type Investor } from "@/lib/services/repo";
import { createSession, deleteSession, investorForSession } from "./sessions";

/** Session cookie handling for server components and route handlers. */

export const SESSION_COOKIE = "ml_session";

function secureCookies(): boolean {
  if (process.env.MYLIQUID_COOKIE_SECURE) return process.env.MYLIQUID_COOKIE_SECURE === "true";
  return process.env.NODE_ENV === "production";
}

export async function currentInvestorId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return investorForSession(getDb(), token);
}

export async function currentInvestor(): Promise<Investor | null> {
  const id = await currentInvestorId();
  return id ? findInvestor(getDb(), id) : null;
}

/** For pages: the signed-in investor, or a redirect to the login page. */
export async function requireInvestor(): Promise<Investor> {
  const investor = await currentInvestor();
  if (!investor) redirect("/login");
  return investor;
}

/** For API routes: the signed-in investor's id, or a 401. */
export async function requireApiInvestor(): Promise<string> {
  const id = await currentInvestorId();
  if (!id) throw new HttpError(401, "Sign in to continue");
  return id;
}

export async function startSession(investorId: string): Promise<void> {
  const { token, expiresAt } = createSession(getDb(), investorId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  deleteSession(getDb(), jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
}
