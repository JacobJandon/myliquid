import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { HttpError } from "@/lib/api";

/**
 * The founder's dashboard (/admin) sees research answers and analytics across every account, so it has its own
 * secret, `MYLIQUID_ADMIN_TOKEN`. Without it, /admin doesn't exist.
 */

export const ADMIN_COOKIE = "ml_admin";
export const ADMIN_MAX_AGE = 8 * 60 * 60;

export function adminEnabled(): boolean {
  return (process.env.MYLIQUID_ADMIN_TOKEN ?? "").length >= 16;
}

function expected(): string {
  return createHmac("sha256", process.env.MYLIQUID_ADMIN_TOKEN ?? "")
    .update("myliquid-admin-v1")
    .digest("hex");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function adminTokenMatches(token: string): boolean {
  return adminEnabled() && same(token, process.env.MYLIQUID_ADMIN_TOKEN ?? "");
}

export function adminCookieValue(): string {
  return expected();
}

export async function isAdmin(): Promise<boolean> {
  if (!adminEnabled()) return false;
  const v = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!v && same(v, expected());
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new HttpError(401, "Admin only");
}
