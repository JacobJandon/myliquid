import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { runDueTraders } from "@/lib/services/hostedTraders";
import { advanceDays } from "@/lib/services/sim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AdvanceBody = z.object({ days: z.number().int().min(1).max(90) });

/** Demo control: moves the shared simulated market forward, then the investor's hosted traders work the new day. */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const { days } = await parseBody(req, AdvanceBody);
  const db = getDb();
  const reports = advanceDays(db, days, investorId);
  const tradersRan = await runDueTraders(db, investorId);
  return json({ reports, tradersRan });
});
