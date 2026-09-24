import { DEMO_INVESTOR_ID, simDate, type Db } from "@/lib/db";
import { addDays } from "@/lib/domain/dates";
import { buildLiquidityLadder, type LadderBucket, type PendingCash } from "@/lib/domain/liquidity";
import { buildSnapshot } from "@/lib/domain/portfolio";
import type { PortfolioSnapshot } from "@/lib/domain/types";
import { requireProduct } from "@/lib/domain/catalog";
import { getCash, getLots, latestPrices } from "./repo";

export function getPendingCash(db: Db): PendingCash[] {
  const rows = db
    .prepare(
      "SELECT product_id, filled_cents, settle_on FROM orders WHERE investor_id = ? AND status = 'settling' AND side = 'sell' ORDER BY settle_on",
    )
    .all(DEMO_INVESTOR_ID) as { product_id: string; filled_cents: number; settle_on: string }[];
  return rows.map((r) => ({
    amountCents: r.filled_cents,
    settleOn: r.settle_on,
    label: `${requireProduct(r.product_id).name} sale proceeds`,
  }));
}

export function getSnapshot(db: Db, date: string = simDate(db)): PortfolioSnapshot {
  const pending = getPendingCash(db);
  return buildSnapshot({
    date,
    cashCents: getCash(db),
    pendingCashCents: pending.reduce((s, p) => s + p.amountCents, 0),
    lots: getLots(db),
    latestPrices: latestPrices(db, date),
  });
}

export function getLadder(db: Db, snapshot: PortfolioSnapshot = getSnapshot(db)): LadderBucket[] {
  return buildLiquidityLadder(snapshot, getLots(db), getPendingCash(db));
}

export function recordNav(db: Db, snapshot: PortfolioSnapshot = getSnapshot(db)): void {
  db.prepare(
    "INSERT OR REPLACE INTO nav_history (investor_id, date, total_cents) VALUES (?, ?, ?)",
  ).run(DEMO_INVESTOR_ID, snapshot.date, snapshot.totalCents);
}

export function getNavHistory(db: Db, days = 365): { date: string; totalCents: number }[] {
  const from = addDays(simDate(db), -days);
  return db
    .prepare(
      "SELECT date, total_cents AS totalCents FROM nav_history WHERE investor_id = ? AND date >= ? ORDER BY date",
    )
    .all(DEMO_INVESTOR_ID, from) as { date: string; totalCents: number }[];
}

/** Net deposits minus withdrawals, used to show performance separately from contributions. */
export function getNetContributions(db: Db): number {
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(CASE WHEN kind = 'deposit' THEN amount_cents ELSE -amount_cents END), 0) AS net FROM cash_movements WHERE investor_id = ?",
    )
    .get(DEMO_INVESTOR_ID) as { net: number };
  return row.net;
}
