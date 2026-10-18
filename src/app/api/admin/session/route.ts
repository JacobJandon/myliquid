import { cookies } from "next/headers";
import { z } from "zod";
import { HttpError, handle, json, parseBody } from "@/lib/api";
import {
  ADMIN_COOKIE,
  ADMIN_MAX_AGE,
  adminCookieValue,
  adminEnabled,
  adminTokenMatches,
} from "@/lib/auth/admin";
import { tooManyAttempts } from "@/lib/auth/rateLimit";
import { secureCookies } from "@/lib/auth/siteGate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Signs in to the founder's dashboard with MYLIQUID_ADMIN_TOKEN. */
export const POST = handle(async (req: Request) => {
  if (!adminEnabled()) throw new HttpError(404, "Not found");
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "local";
  if (tooManyAttempts(`admin:${ip}`, 10))
    throw new HttpError(429, "Too many attempts. Wait 15 minutes.");
  const { token } = await parseBody(req, z.object({ token: z.string().max(500) }));
  if (!adminTokenMatches(token)) throw new HttpError(403, "That isn't the admin token.");
  (await cookies()).set(ADMIN_COOKIE, adminCookieValue(), {
    httpOnly: true,
    sameSite: "strict",
    secure: secureCookies(),
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
  return json({ ok: true });
});

export const DELETE = handle(async () => {
  (await cookies()).delete(ADMIN_COOKIE);
  return json({ ok: true });
});
