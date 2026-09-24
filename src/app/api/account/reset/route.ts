import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { resetPortfolio } from "@/lib/services/investors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ResetBody = z.object({ starter: z.enum(["sample", "cash"]) });

/** Wipes the signed-in investor's portfolio and activity and starts again (login and API keys are kept). */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const { starter } = await parseBody(req, ResetBody);
  resetPortfolio(getDb(), investorId, starter);
  return json({ ok: true });
});
