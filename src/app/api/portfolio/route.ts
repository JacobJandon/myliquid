import { getDb } from "@/lib/db";
import { handle, json } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { getLadder, getNavHistory, getSnapshot } from "@/lib/services/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const investorId = await requireApiInvestor();
  const db = getDb();
  const snapshot = getSnapshot(db, investorId);
  return json({
    snapshot,
    ladder: getLadder(db, investorId, snapshot),
    nav: getNavHistory(db, investorId, 365),
  });
});
