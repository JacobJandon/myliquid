import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { advanceDays } from "@/lib/services/sim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AdvanceBody = z.object({ days: z.number().int().min(1).max(90) });

/** Demo control: moves the shared simulated market forward. */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const { days } = await parseBody(req, AdvanceBody);
  return json({ reports: advanceDays(getDb(), days, investorId) });
});
