import { z } from "zod";
import { getDb } from "@/lib/db";
import { HttpError, handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { REASON_TEXT, ainraMode, ainraModeLabel, checkPassport, sampleBundle } from "@/lib/ainra";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  passport: z.unknown().optional(),
  sample: z.enum(["valid", "revoked"]).optional(),
});

/** Verifies any AINRA passport locally, for the Connect page. Nothing is stored and nothing leaves MyLiquid. */
export const POST = handle(async (req: Request) => {
  await requireApiInvestor();
  getDb();
  const body = await parseBody(req, Body);
  if (body.sample && ainraMode() !== "testbed")
    throw new HttpError(400, "Sample passports are only available in testbed mode.");
  const passport = body.sample ? await sampleBundle(body.sample) : body.passport;
  const check = checkPassport(passport);
  return json({
    check,
    explanation: check.reason ? (REASON_TEXT[check.reason] ?? check.reason) : null,
    trust: ainraModeLabel(),
  });
});
