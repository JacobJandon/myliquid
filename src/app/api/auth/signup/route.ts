import { z } from "zod";
import { getDb } from "@/lib/db";
import { HttpError, handle, json, parseBody } from "@/lib/api";
import { hashPassword } from "@/lib/auth/crypto";
import { currentInvestor, startSession } from "@/lib/auth/current";
import { createInvestor, findInvestorByEmail, upgradeGuest } from "@/lib/services/investors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SignupBody = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  riskProfile: z.enum(["conservative", "balanced", "growth", "aggressive"]),
  starter: z.enum(["sample", "cash"]).default("cash"),
});

/** Creates an account. If the visitor is exploring as a guest, their portfolio is kept. */
export const POST = handle(async (req: Request) => {
  const body = await parseBody(req, SignupBody);
  const db = getDb();
  if (findInvestorByEmail(db, body.email))
    throw new HttpError(409, "An account with that email already exists. Log in instead.");
  const passwordHash = hashPassword(body.password);
  const current = await currentInvestor();
  if (current?.kind === "guest") {
    upgradeGuest(db, current.id, {
      name: body.name,
      email: body.email,
      passwordHash,
      riskProfile: body.riskProfile,
    });
    return json({ ok: true, upgraded: true });
  }
  const id = createInvestor(db, {
    kind: "user",
    name: body.name,
    email: body.email,
    passwordHash,
    riskProfile: body.riskProfile,
    starter: body.starter,
  });
  await startSession(id);
  return json({ ok: true, upgraded: false });
});
