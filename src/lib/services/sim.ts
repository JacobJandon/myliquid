import { DEMO_INVESTOR_ID, getMeta, nowIso, setMeta, simDate, type Db } from "@/lib/db";
import { PRODUCTS, requireProduct } from "@/lib/domain/catalog";
import { addDays, isQuarterEnd, nextRedemptionWindow } from "@/lib/domain/dates";
import { hashToUnit, simulateNextPoint } from "@/lib/domain/market";
import { formatPct, formatUsd } from "@/lib/domain/money";
import type { PricePoint } from "@/lib/domain/types";
import { logEvent } from "./audit";
import { raiseAlert } from "./alerts";
import { removeUnitsFifo } from "./orders";
import { getSnapshot, recordNav } from "./portfolio";
import { adjustCash, getMandate, updateMandate } from "./repo";
import { evaluateRules } from "./rules";

/**
 * The market clock. Advancing a day moves prices, settles trades, runs quarterly
 * redemption windows, checks the circuit breaker and lets Quant evaluate autopilot rules.
 */

export interface DayReport {
  date: string;
  navCents: number;
  navChangePct: number;
  events: string[];
}

function lastPoint(db: Db, productId: string): PricePoint {
  return db
    .prepare(
      "SELECT date, price, source FROM prices WHERE product_id = ? ORDER BY date DESC LIMIT 1",
    )
    .get(productId) as PricePoint;
}

function lastAppraisalDate(db: Db, productId: string): string {
  const row = db
    .prepare("SELECT MAX(date) AS d FROM prices WHERE product_id = ?")
    .get(productId) as { d: string };
  return row.d;
}

/** Simulated share of a fund's NAV that all investors ask to redeem in a window (2%–10%). */
export function simulatedRedemptionDemand(productId: string, windowDate: string): number {
  return 0.02 + 0.08 * hashToUnit(`demand:${productId}:${windowDate}`);
}

export function advanceOneDay(db: Db): DayReport {
  const events: string[] = [];
  const before = getSnapshot(db);
  const today = addDays(simDate(db), 1);

  db.transaction(() => {
    setMeta(db, "sim_date", today);

    // 1. Prices and appraisals
    const insert = db.prepare(
      "INSERT OR REPLACE INTO prices (product_id, date, price, source) VALUES (?, ?, ?, ?)",
    );
    for (const product of PRODUCTS) {
      const last = lastPoint(db, product.id);
      const next = simulateNextPoint(product, last, lastAppraisalDate(db, product.id), today);
      if (next) insert.run(product.id, next.date, next.price, next.source);
    }

    // 2. Settle sale proceeds
    const settling = db
      .prepare(
        "SELECT id, product_id, filled_cents FROM orders WHERE investor_id = ? AND status = 'settling' AND settle_on <= ?",
      )
      .all(DEMO_INVESTOR_ID, today) as { id: string; product_id: string; filled_cents: number }[];
    for (const o of settling) {
      adjustCash(db, o.filled_cents);
      db.prepare("UPDATE orders SET status = 'settled' WHERE id = ?").run(o.id);
      events.push(
        `${formatUsd(o.filled_cents)} from ${requireProduct(o.product_id).name} settled to cash`,
      );
    }

    // 3. Settle withdrawals
    const withdrawals = db
      .prepare(
        "SELECT id, amount_cents FROM cash_movements WHERE investor_id = ? AND status = 'settling' AND settle_on <= ?",
      )
      .all(DEMO_INVESTOR_ID, today) as { id: string; amount_cents: number }[];
    for (const w of withdrawals) {
      db.prepare("UPDATE cash_movements SET status = 'settled' WHERE id = ?").run(w.id);
      events.push(`Withdrawal of ${formatUsd(w.amount_cents)} arrived at the bank`);
    }

    // 4. Quarterly redemption windows (with gates)
    if (isQuarterEnd(today)) {
      const queued = db
        .prepare(
          "SELECT * FROM orders WHERE investor_id = ? AND status = 'queued' AND window_on <= ?",
        )
        .all(DEMO_INVESTOR_ID, today) as {
        id: string;
        product_id: string;
        units: number;
        amount_cents: number;
        placed_by: string;
      }[];
      for (const q of queued) {
        const product = requireProduct(q.product_id);
        const price = lastPoint(db, product.id).price;
        const demand = simulatedRedemptionDemand(product.id, today);
        const gate = product.liquidity.gatePct ?? 1;
        const fillRatio = demand > gate ? gate / demand : 1;
        const units = removeUnitsFifo(db, product.id, q.units * fillRatio, today);
        const proceeds = Math.round(units * price * 100);
        const settleOn = addDays(today, product.liquidity.settlementDays);
        db.prepare(
          "UPDATE orders SET status = 'settling', units = ?, price = ?, filled_cents = ?, settle_on = ? WHERE id = ?",
        ).run(units, price, proceeds, settleOn, q.id);
        const remainingUnits = q.units - units;
        if (fillRatio < 1 && remainingUnits > 1e-9) {
          const nextWindow = nextRedemptionWindow(addDays(today, 1), 0);
          db.prepare(
            `INSERT INTO orders (id, investor_id, product_id, side, amount_cents, filled_cents, units, price, status, placed_by, autonomous,
              created_on, window_on, note, checks, created_at)
             VALUES (?, ?, ?, 'sell', ?, 0, ?, ?, 'queued', ?, 0, ?, ?, ?, '[]', ?)`,
          ).run(
            `${q.id}_r${today.replace(/-/g, "")}`,
            DEMO_INVESTOR_ID,
            product.id,
            Math.round(remainingUnits * price * 100),
            remainingUnits,
            price,
            q.placed_by,
            today,
            nextWindow,
            `Rolled over: the ${today} window was gated`,
            nowIso(),
          );
          raiseAlert(db, {
            agent: "sentinel",
            severity: "warn",
            code: "redemption_gated",
            productId: product.id,
            title: `${product.name} redemption was pro-rated`,
            detail: `Investors asked for ${formatPct(demand)} of the fund but the gate is ${formatPct(gate, 0)}, so ${formatPct(fillRatio, 0)} of your request was filled. The rest rolls to ${nextWindow}.`,
          });
          events.push(
            `${product.name} window: ${formatPct(fillRatio, 0)} filled (gated), remainder rolls to ${nextWindow}`,
          );
        } else {
          events.push(
            `${product.name} redemption filled in full: ${formatUsd(proceeds)}, settles ${settleOn}`,
          );
        }
      }
    }
  })();

  // 5. NAV and circuit breaker
  const after = getSnapshot(db);
  recordNav(db, after);
  const change = before.totalCents > 0 ? after.totalCents / before.totalCents - 1 : 0;
  const mandate = getMandate(db);
  if (change <= -mandate.circuitBreakerPct && !mandate.killSwitch) {
    updateMandate(db, {
      killSwitch: true,
      killReason: `Circuit breaker: portfolio fell ${formatPct(change)} on ${today}`,
    });
    raiseAlert(db, {
      agent: "sentinel",
      severity: "critical",
      code: "circuit_breaker",
      title: "Circuit breaker tripped. All agents paused.",
      detail: `The portfolio fell ${formatPct(change)} in one day (threshold ${formatPct(mandate.circuitBreakerPct, 0)}). Review, then resume agents in Settings.`,
    });
    events.push("Circuit breaker tripped: all agents paused");
  }

  // 6. Autopilot rules (skipped while agents are paused)
  if (!getMandate(db).killSwitch) {
    for (const { rule, result } of evaluateRules(db)) {
      events.push(`Autopilot "${rule.name}": ${result.outcome}`);
    }
  }

  for (const e of events) logEvent(db, { agent: "system", kind: "system", title: e });
  return { date: today, navCents: after.totalCents, navChangePct: change, events };
}

export function advanceDays(db: Db, days: number): DayReport[] {
  const n = Math.max(1, Math.min(Math.floor(days), 90));
  const reports: DayReport[] = [];
  for (let i = 0; i < n; i++) reports.push(advanceOneDay(db));
  logEvent(db, {
    agent: "system",
    kind: "system",
    title: `Market advanced ${n} day${n === 1 ? "" : "s"} to ${simDate(db)}`,
  });
  return reports;
}

export function historyStart(db: Db): string {
  return getMeta(db, "history_start") ?? simDate(db);
}
