import { getDb } from "@/lib/db";
import { handle, json } from "@/lib/api";
import { getLadder, getNavHistory, getSnapshot } from "@/lib/services/portfolio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(() => {
  const db = getDb();
  const snapshot = getSnapshot(db);
  return json({ snapshot, ladder: getLadder(db, snapshot), nav: getNavHistory(db, 365) });
});
