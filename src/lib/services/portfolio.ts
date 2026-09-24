import { simDate, type Db } from "@/lib/db";
import { requireProduct } from "@/lib/domain/catalog";
import { addDays } from "@/lib/domain/dates";
import { buildLiquidityLadder, type LadderBucket, type PendingCash } from "@/lib/domain/liquidity";
import { buildSnapshot } from "@/lib/domain/portfolio";
import type { PortfolioSnapshot } from "@/lib/domain/types";
import { getCash, getLots, latestPrices } from "./repo";

export function getPendingCash(db: Db, investorId: string): PendingCash[] {
  const rows = db
    .prepare(
      "SELECT product_id, filled_cents, settle_on FROM orders WHERE investor_id = ? AND status = 'settling' AND side = 'sell' ORDER BY settle_on",
    )
    .all(investorId) as { product_id: string; filled_cents: number; settle_on: string }[];
  return rows.map((r) => ({
    amountCents: r.filled_cents,
    settleOn: r.settle_on,
    label: `${requireProduct(r.product_id).name} sale proceeds`,
  }));
}

export function getSnapshot(
  db: Db,
  investorId: string,
  date: string = simDate(db),
): PortfolioSnapshot {
  const pending = getPendingCash(db, investorId);
  return buildSnapshot({
    date,
    cashCents: getCash(db, investorId),
    pendingCashCents: pending.reduce((s, p) => s + p.amountCents, 0),
    lots: getLots(db, investorId),
    latestPrices: latestPrices(db, date),
  });
}

export function getLadder(
  db: Db,
  investorId: string,
  snapshot: PortfolioSnapshot = getSnapshot(db, investorId),
): LadderBucket[] {
  return buildLiquidityLadder(snapshot, getLots(db, investorId), getPendingCash(db, investorId));
}

export function recordNav(
  db: Db,
  investorId: string,
  snapshot: PortfolioSnapshot = getSnapshot(db, investorId),
): void {
  db.prepare(
    "INSERT OR REPLACE INTO nav_history (investor_id, date, total_cents) VALUES (?, ?, ?)",
  ).run(investorId, snapshot.date, snapshot.totalCents);
}

export function getNavHistory(
  db: Db,
  investorId: string,
  days = 365,
): { date: string; totalCents: number }[] {
  const from = addDays(simDate(db), -days);
  return db
    .prepare(
      "SELECT date, total_cents AS totalCents FROM nav_history WHERE investor_id = ? AND date >= ? ORDER BY date",
    )
    .all(investorId, from) as { date: string; totalCents: number }[];
}

/** Net deposits minus withdrawals, used to show performance separately from contributions. */
export function getNetContributions(db: Db, investorId: string): number {
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(CASE WHEN kind = 'deposit' THEN amount_cents ELSE -amount_cents END), 0) AS net FROM cash_movements WHERE investor_id = ?",
    )
    .get(investorId) as { net: number };
  return row.net;
}
