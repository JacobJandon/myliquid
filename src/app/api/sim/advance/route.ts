import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, HttpError, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { runDueTraders } from "@/lib/services/hostedTraders";
import { advanceDays, canAdvanceMarket } from "@/lib/services/sim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AdvanceBody = z.object({ days: z.number().int().min(1).max(90) });

/**
 * Moves the shared simulated market forward, then the investor's hosted traders work the new day. Only where the
 * market clock allows it (`canAdvanceMarket`): on a shared deployment the market follows the calendar.
 */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  if (!canAdvanceMarket())
    throw new HttpError(
      409,
      "The market here follows the calendar: it moves one day each day, for everyone.",
    );
  const { days } = await parseBody(req, AdvanceBody);
  const db = getDb();
  const reports = advanceDays(db, days, investorId);
  const tradersRan = await runDueTraders(db, investorId);
  return json({ reports, tradersRan });
});
