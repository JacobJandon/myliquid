import { cookies } from "next/headers";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { HttpError, handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor, SESSION_COOKIE } from "@/lib/auth/current";
import { tooManyAttempts } from "@/lib/auth/rateLimit";
import { deleteOtherSessions } from "@/lib/auth/sessions";
import { changePassword } from "@/lib/services/investors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PasswordBody = z.object({
  current: z.string().min(1).max(200),
  next: z.string().min(8, "Password must be at least 8 characters").max(200),
});

/** Changes the signed-in investor's password, then signs them out on every other device. */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  if (tooManyAttempts(`password:${investorId}`))
    throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");
  const { current, next } = await parseBody(req, PasswordBody);
  const db = getDb();
  if (!changePassword(db, investorId, current, next))
    throw new HttpError(403, "Your current password isn't right.");
  const signedOut = deleteOtherSessions(
    db,
    investorId,
    (await cookies()).get(SESSION_COOKIE)?.value ?? null,
  );
  return json({ ok: true, signedOut });
});
