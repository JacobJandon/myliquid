import { newId, nowIso, simDate, type Db } from "@/lib/db";
import {
  CADENCE_LABELS,
  LIMIT_ORDER_DAYS,
  catchUpRunOn,
  limitTriggered,
  nextRunOn,
  standingOrderAmountError,
  supportsStandingOrders,
  type Cadence,
} from "@/lib/domain/automation";
import { requireProduct } from "@/lib/domain/catalog";
import { addDays } from "@/lib/domain/dates";
import { formatPrice, formatUsd } from "@/lib/domain/money";
import { raiseAlert } from "./alerts";
import { logEvent } from "./audit";
import { awardXp } from "./companion";
import { executeOrder, previewOrder } from "./orders";
import { currentPrice } from "./repo";

/**
 * The investor's standing instructions: recurring investments and limit orders.
 * They are the investor's own orders, so they keep running while agents are
 * paused, but every fill goes through `executeOrder` and its pre-trade checks.
 */

// ── Recurring investments ───────────────────────────────────────────────────

export interface RecurringPlan {
  id: string;
  productId: string;
  productName: string;
  amountCents: number;
  cadence: Cadence;
  status: "active" | "paused";
  nextRunOn: string;
  lastRunOn: string | null;
  lastResult: string | null;
  runs: number;
  createdAt: string;
}

function mapPlan(r: Record<string, unknown>): RecurringPlan {
  return {
    id: r.id as string,
    productId: r.product_id as string,
    productName: requireProduct(r.product_id as string).name,
    amountCents: r.amount_cents as number,
    cadence: r.cadence as Cadence,
    status: r.status as "active" | "paused",
    nextRunOn: r.next_run_on as string,
    lastRunOn: (r.last_run_on as string | null) ?? null,
    lastResult: (r.last_result as string | null) ?? null,
    runs: r.runs as number,
    createdAt: r.created_at as string,
  };
}

export function listPlans(db: Db, investorId: string): RecurringPlan[] {
  return (
    db
      .prepare("SELECT * FROM recurring_plans WHERE investor_id = ? ORDER BY created_at DESC")
      .all(investorId) as Record<string, unknown>[]
  ).map(mapPlan);
}

export function getPlan(db: Db, investorId: string, id: string): RecurringPlan | undefined {
  const row = db
    .prepare("SELECT * FROM recurring_plans WHERE id = ? AND investor_id = ?")
    .get(id, investorId) as Record<string, unknown> | undefined;
  return row ? mapPlan(row) : undefined;
}

export function createPlan(
  db: Db,
  investorId: string,
  input: { productId: string; amountCents: number; cadence: Cadence },
): RecurringPlan {
  const product = requireProduct(input.productId);
  if (!supportsStandingOrders(product))
    throw new Error(`${product.name} can't be bought on a schedule: it isn't traded daily.`);
  const amountError = standingOrderAmountError(input.amountCents);
  if (amountError) throw new Error(amountError);
  const id = newId("rip");
  // The first buy happens on the next market day.
  const firstRun = addDays(simDate(db), 1);
  db.prepare(
    `INSERT INTO recurring_plans (id, investor_id, product_id, amount_cents, cadence, status, next_run_on, runs, created_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, 0, ?)`,
  ).run(
    id,
    investorId,
    product.id,
    Math.round(input.amountCents),
    input.cadence,
    firstRun,
    nowIso(),
  );
  logEvent(db, investorId, {
    agent: "user",
    kind: "system",
    title: `Recurring investment: ${formatUsd(input.amountCents)} of ${product.name}, ${CADENCE_LABELS[input.cadence].toLowerCase()}, starting ${firstRun}`,
  });
  awardXp(db, investorId, "savings_plan");
  return getPlan(db, investorId, id)!;
}

export function setPlanStatus(
  db: Db,
  investorId: string,
  id: string,
  status: "active" | "paused",
): RecurringPlan {
  const plan = getPlan(db, investorId, id);
  if (!plan) throw new Error("Recurring investment not found");
  // Resuming never back-fills missed buys: the schedule restarts from today.
  const next =
    status === "active"
      ? catchUpRunOn(plan.cadence, plan.nextRunOn, addDays(simDate(db), 1))
      : plan.nextRunOn;
  db.prepare(
    "UPDATE recurring_plans SET status = ?, next_run_on = ? WHERE id = ? AND investor_id = ?",
  ).run(status, next, id, investorId);
  return getPlan(db, investorId, id)!;
}

export function deletePlan(db: Db, investorId: string, id: string): void {
  db.prepare("DELETE FROM recurring_plans WHERE id = ? AND investor_id = ?").run(id, investorId);
}

/** Runs every plan due today. Called by the market clock once per simulated day. */
export function runDuePlans(db: Db, investorId: string): string[] {
  const today = simDate(db);
  const due = (
    db
      .prepare(
        "SELECT * FROM recurring_plans WHERE investor_id = ? AND status = 'active' AND next_run_on <= ?",
      )
      .all(investorId, today) as Record<string, unknown>[]
  ).map(mapPlan);
  const notes: string[] = [];
  for (const plan of due) {
    const order = executeOrder(
      db,
      investorId,
      { productId: plan.productId, side: "buy", amountCents: plan.amountCents },
      "user",
      { note: `Recurring investment (${CADENCE_LABELS[plan.cadence].toLowerCase()})` },
    );
    const filled = order.status !== "rejected";
    const reasons = order.checks
      .filter((c) => c.status === "block")
      .map((c) => c.detail)
      .join(" ");
    db.prepare(
      "UPDATE recurring_plans SET last_run_on = ?, last_result = ?, runs = runs + ?, next_run_on = ? WHERE id = ?",
    ).run(
      today,
      filled ? "filled" : `skipped: ${reasons}`.slice(0, 300),
      filled ? 1 : 0,
      catchUpRunOn(plan.cadence, nextRunOn(plan.cadence, plan.nextRunOn), addDays(today, 1)),
      plan.id,
    );
    if (filled) {
      notes.push(
        `Recurring investment: bought ${formatUsd(plan.amountCents)} of ${plan.productName}`,
      );
    } else {
      raiseAlert(db, investorId, {
        agent: "sentinel",
        severity: "warn",
        code: "recurring_skipped",
        productId: plan.productId,
        title: `Recurring buy of ${plan.productName} was skipped`,
        detail: `${formatUsd(plan.amountCents)} could not be invested: ${reasons} The plan stays active for its next date.`,
      });
      notes.push(`Recurring investment in ${plan.productName} skipped: ${reasons}`);
    }
  }
  return notes;
}

// ── Limit orders ────────────────────────────────────────────────────────────

export type LimitStatus = "open" | "filled" | "cancelled" | "expired" | "rejected";

export interface LimitOrder {
  id: string;
  productId: string;
  productName: string;
  side: "buy" | "sell";
  amountCents: number;
  limitPrice: number;
  status: LimitStatus;
  createdOn: string;
  expiresOn: string;
  closedOn: string | null;
  orderId: string | null;
  note: string | null;
}

function mapLimit(r: Record<string, unknown>): LimitOrder {
  return {
    id: r.id as string,
    productId: r.product_id as string,
    productName: requireProduct(r.product_id as string).name,
    side: r.side as "buy" | "sell",
    amountCents: r.amount_cents as number,
    limitPrice: r.limit_price as number,
    status: r.status as LimitStatus,
    createdOn: r.created_on as string,
    expiresOn: r.expires_on as string,
    closedOn: (r.closed_on as string | null) ?? null,
    orderId: (r.order_id as string | null) ?? null,
    note: (r.note as string | null) ?? null,
  };
}

export function listLimitOrders(
  db: Db,
  investorId: string,
  opts: { openOnly?: boolean; productId?: string; limit?: number } = {},
): LimitOrder[] {
  const where = ["investor_id = ?"];
  const params: unknown[] = [investorId];
  if (opts.openOnly) where.push("status = 'open'");
  if (opts.productId) {
    where.push("product_id = ?");
    params.push(opts.productId);
  }
  return (
    db
      .prepare(
        `SELECT * FROM limit_orders WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT ?`,
      )
      .all(...params, opts.limit ?? 50) as Record<string, unknown>[]
  ).map(mapLimit);
}

export function getLimitOrder(db: Db, investorId: string, id: string): LimitOrder | undefined {
  const row = db
    .prepare("SELECT * FROM limit_orders WHERE id = ? AND investor_id = ?")
    .get(id, investorId) as Record<string, unknown> | undefined;
  return row ? mapLimit(row) : undefined;
}

/**
 * Places a limit order. If today's price already meets the limit it fills now;
 * otherwise it waits for the market clock. Orders that the checks would block
 * today (not enough cash, nothing to sell) are refused up front.
 */
export function placeLimitOrder(
  db: Db,
  investorId: string,
  input: { productId: string; side: "buy" | "sell"; amountCents: number; limitPrice: number },
): LimitOrder {
  const product = requireProduct(input.productId);
  if (!supportsStandingOrders(product))
    throw new Error(`${product.name} has no live market price, so it can't take limit orders.`);
  const amountError = standingOrderAmountError(input.amountCents);
  if (amountError) throw new Error(amountError);
  if (!(input.limitPrice > 0)) throw new Error("The limit price must be above zero.");
  const intent = {
    productId: product.id,
    side: input.side,
    amountCents: Math.round(input.amountCents),
  };
  const preview = previewOrder(db, investorId, intent, "user");
  if (preview.blocked) {
    throw new Error(
      preview.checks
        .filter((c) => c.status === "block")
        .map((c) => c.detail)
        .join(" "),
    );
  }
  const today = simDate(db);
  const id = newId("lmt");
  db.prepare(
    `INSERT INTO limit_orders (id, investor_id, product_id, side, amount_cents, limit_price, status, created_on, expires_on, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
  ).run(
    id,
    investorId,
    product.id,
    input.side,
    intent.amountCents,
    input.limitPrice,
    today,
    addDays(today, LIMIT_ORDER_DAYS),
    nowIso(),
  );
  logEvent(db, investorId, {
    agent: "user",
    kind: "order",
    title: `Limit ${input.side}: ${formatUsd(intent.amountCents)} of ${product.name} at ${formatPrice(input.limitPrice)} or ${input.side === "buy" ? "lower" : "higher"}`,
  });
  // Marketable already? Fill it now at today's price.
  fillIfTriggered(db, investorId, getLimitOrder(db, investorId, id)!, today);
  return getLimitOrder(db, investorId, id)!;
}

export function cancelLimitOrder(db: Db, investorId: string, id: string): LimitOrder {
  const order = getLimitOrder(db, investorId, id);
  if (!order) throw new Error("Limit order not found");
  if (order.status !== "open") throw new Error(`This limit order is already ${order.status}.`);
  db.prepare(
    "UPDATE limit_orders SET status = 'cancelled', closed_on = ? WHERE id = ? AND investor_id = ?",
  ).run(simDate(db), id, investorId);
  return getLimitOrder(db, investorId, id)!;
}

function fillIfTriggered(db: Db, investorId: string, lo: LimitOrder, today: string): string | null {
  const price = currentPrice(db, lo.productId, today);
  if (price === null || !limitTriggered(lo.side, price, lo.limitPrice)) return null;
  const order = executeOrder(
    db,
    investorId,
    { productId: lo.productId, side: lo.side, amountCents: lo.amountCents },
    "user",
    { note: `Limit ${lo.side} at ${formatPrice(lo.limitPrice)}` },
  );
  if (order.status === "rejected") {
    const reasons = order.checks
      .filter((c) => c.status === "block")
      .map((c) => c.detail)
      .join(" ");
    db.prepare(
      "UPDATE limit_orders SET status = 'rejected', closed_on = ?, order_id = ?, note = ? WHERE id = ?",
    ).run(today, order.id, reasons.slice(0, 300), lo.id);
    raiseAlert(db, investorId, {
      agent: "sentinel",
      severity: "warn",
      code: "limit_rejected",
      productId: lo.productId,
      title: `Limit ${lo.side} of ${lo.productName} couldn't fill`,
      detail: `The price reached ${formatPrice(price)}, but the order was blocked: ${reasons}`,
    });
    return `Limit ${lo.side} of ${lo.productName} blocked at ${formatPrice(price)}: ${reasons}`;
  }
  db.prepare(
    "UPDATE limit_orders SET status = 'filled', closed_on = ?, order_id = ? WHERE id = ?",
  ).run(today, order.id, lo.id);
  return `Limit ${lo.side} filled: ${formatUsd(lo.amountCents)} of ${lo.productName} at ${formatPrice(price)} (limit ${formatPrice(lo.limitPrice)})`;
}

/** Checks every open limit order against today's price. Called by the market clock. */
export function evaluateLimitOrders(db: Db, investorId: string): string[] {
  const today = simDate(db);
  const notes: string[] = [];
  for (const lo of listLimitOrders(db, investorId, { openOnly: true, limit: 500 })) {
    if (lo.expiresOn < today) {
      db.prepare("UPDATE limit_orders SET status = 'expired', closed_on = ? WHERE id = ?").run(
        today,
        lo.id,
      );
      notes.push(`Limit ${lo.side} of ${lo.productName} at ${formatPrice(lo.limitPrice)} expired`);
      continue;
    }
    const note = fillIfTriggered(db, investorId, lo, today);
    if (note) notes.push(note);
  }
  return notes;
}
