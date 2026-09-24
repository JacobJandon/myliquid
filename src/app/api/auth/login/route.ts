import { z } from "zod";
import { getDb } from "@/lib/db";
import { HttpError, handle, json, parseBody } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/crypto";
import { startSession } from "@/lib/auth/current";
import { tooManyAttempts } from "@/lib/auth/rateLimit";
import { findInvestorByEmail } from "@/lib/services/investors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LoginBody = z.object({ email: z.string().trim().max(200), password: z.string().max(200) });

export const POST = handle(async (req: Request) => {
  const { email, password } = await parseBody(req, LoginBody);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooManyAttempts(`${ip}:${email.toLowerCase()}`))
    throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
  const found = findInvestorByEmail(getDb(), email);
  if (!found || !verifyPassword(password, found.passwordHash))
    throw new HttpError(401, "Email or password is incorrect.");
  await startSession(found.id);
  return json({ ok: true });
});
