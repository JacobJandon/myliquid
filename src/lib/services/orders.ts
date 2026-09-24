import { DEMO_INVESTOR_ID, newId, nowIso, simDate, type Db } from "@/lib/db";
import { requireProduct } from "@/lib/domain/catalog";
import { addDays, addMonths, nextRedemptionWindow } from "@/lib/domain/dates";
import { formatUsd } from "@/lib/domain/money";
import { isBlocked, runPreTradeChecks, type AutonomyContext } from "@/lib/domain/risk";
import type { Actor, CheckResult, OrderIntent } from "@/lib/domain/types";
import { logEvent } from "./audit";
import { getDealReview } from "./deals";
import { getSnapshot, recordNav } from "./portfolio";
import {
  adjustCash,
  currentPrice,
  getAvailableLots,
  getCash,
  getInvestor,
  getMandate,
  getProfile,
} from "./repo";

export type OrderStatus = "filled" | "settling" | "settled" | "queued" | "rejected" | "cancelled";

export interface OrderRecord {
  id: string;
  productId: string;
  side: "buy" | "sell";
  amountCents: number;
  filledCents: number;
  units: number;
  price: number | null;
  status: OrderStatus;
  placedBy: Actor;
  autonomous: boolean;
  proposalId: string | null;
  createdOn: string;
  settleOn: string | null;
  windowOn: string | null;
  note: string | null;
  checks: CheckResult[];
  createdAt: string;
}

function mapOrder(r: Record<string, unknown>): OrderRecord {
  return {
    id: r.id as string,
    productId: r.product_id as string,
    side: r.side as "buy" | "sell",
    amountCents: r.amount_cents as number,
    filledCents: r.filled_cents as number,
    units: r.units as number,
    price: (r.price as number | null) ?? null,
    status: r.status as OrderStatus,
    placedBy: r.placed_by as Actor,
    autonomous: r.autonomous === 1,
    proposalId: (r.proposal_id as string | null) ?? null,
    createdOn: r.created_on as string,
    settleOn: (r.settle_on as string | null) ?? null,
    windowOn: (r.window_on as string | null) ?? null,
    note: (r.note as string | null) ?? null,
    checks: JSON.parse((r.checks as string) || "[]") as CheckResult[],
    createdAt: r.created_at as string,
  };
}

export function getOrder(db: Db, id: string): OrderRecord | undefined {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as
    Record<string, unknown> | undefined;
  return row ? mapOrder(row) : undefined;
}

export function listOrders(db: Db, limit = 100): OrderRecord[] {
  const rows = db
    .prepare(
      "SELECT * FROM orders WHERE investor_id = ? ORDER BY created_on DESC, created_at DESC LIMIT ?",
    )
    .all(DEMO_INVESTOR_ID, limit) as Record<string, unknown>[];
  return rows.map(mapOrder);
}

/** How much agents have done on their own (no human approval), for the mandate checks. */
export function getAutonomyContext(db: Db): AutonomyContext {
  const today = simDate(db);
  const todayRow = db
    .prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(amount_cents), 0) AS notional FROM orders
       WHERE investor_id = ? AND autonomous = 1 AND created_on = ? AND status != 'rejected'`,
    )
    .get(DEMO_INVESTOR_ID, today) as { n: number; notional: number };
  const budgetRow = db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN side = 'buy' THEN filled_cents ELSE -filled_cents END), 0) AS used FROM orders
       WHERE investor_id = ? AND autonomous = 1 AND status != 'rejected'`,
    )
    .get(DEMO_INVESTOR_ID) as { used: number };
  return {
    mandate: getMandate(db),
    ordersToday: todayRow.n,
    notionalTodayCents: todayRow.notional,
    budgetUsedCents: Math.max(0, budgetRow.used),
  };
}

export interface OrderPreview {
  checks: CheckResult[];
  blocked: boolean;
  price: number;
  estimatedUnits: number;
}

export function previewOrder(
  db: Db,
  intent: OrderIntent,
  actor: Actor,
  opts: { autonomous?: boolean } = {},
): OrderPreview {
  const today = simDate(db);
  const product = requireProduct(intent.productId);
  const snapshot = getSnapshot(db, today);
  const checks = runPreTradeChecks({
    today,
    snapshot,
    lots: getAvailableLots(db),
    profile: getProfile(db),
    order: intent,
    actor,
    kycVerified: getInvestor(db).kycStatus === "verified",
    dealVerdict:
      product.kind === "deal" ? (getDealReview(db, product.id)?.verdict ?? null) : undefined,
    autonomous: opts.autonomous ? getAutonomyContext(db) : undefined,
  });
  const price = currentPrice(db, product.id, today) ?? product.startPrice;
  return {
    checks,
    blocked: isBlocked(checks),
    price,
    estimatedUnits: intent.amountCents / 100 / price,
  };
}

/**
 * Runs the pre-trade checks and, if nothing blocks, books the order. Blocked
 * orders are stored as `rejected` so the audit trail shows what was attempted.
 */
export function executeOrder(
  db: Db,
  intent: OrderIntent,
  actor: Actor,
  opts: { autonomous?: boolean; proposalId?: string; note?: string; runId?: string | null } = {},
): OrderRecord {
  const run = db.transaction((): OrderRecord => {
    const today = simDate(db);
    const product = requireProduct(intent.productId);
    const preview = previewOrder(db, intent, actor, opts);
    const id = newId("ord");
    const base = {
      id,
      product_id: product.id,
      side: intent.side,
      amount_cents: Math.round(intent.amountCents),
      placed_by: actor,
      autonomous: opts.autonomous ? 1 : 0,
      proposal_id: opts.proposalId ?? null,
      created_on: today,
      note: opts.note ?? null,
      checks: JSON.stringify(preview.checks),
      created_at: nowIso(),
    };
    const insert = db.prepare(
      `INSERT INTO orders (id, investor_id, product_id, side, amount_cents, filled_cents, units, price, status, placed_by,
        autonomous, proposal_id, created_on, settle_on, window_on, note, checks, created_at)
       VALUES (@id, '${DEMO_INVESTOR_ID}', @product_id, @side, @amount_cents, @filled_cents, @units, @price, @status, @placed_by,
        @autonomous, @proposal_id, @created_on, @settle_on, @window_on, @note, @checks, @created_at)`,
    );

    if (preview.blocked) {
      insert.run({
        ...base,
        filled_cents: 0,
        units: 0,
        price: preview.price,
        status: "rejected",
        settle_on: null,
        window_on: null,
      });
      const reasons = preview.checks
        .filter((c) => c.status === "block")
        .map((c) => c.detail)
        .join(" ");
      logEvent(db, {
        runId: opts.runId,
        agent: actor,
        kind: "order",
        title: `Blocked: ${intent.side} ${formatUsd(intent.amountCents)} ${product.id}. ${reasons}`,
        payload: { orderId: id },
      });
      return getOrder(db, id)!;
    }

    const price = preview.price;
    if (intent.side === "buy") {
      const units = intent.amountCents / 100 / price;
      adjustCash(db, -intent.amountCents);
      const lockedUntil =
        product.liquidity.lockupMonths > 0
          ? addMonths(today, product.liquidity.lockupMonths)
          : null;
      db.prepare(
        "INSERT INTO lots (id, investor_id, product_id, units, cost_cents, acquired_on, locked_until) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(
        newId("lot"),
        DEMO_INVESTOR_ID,
        product.id,
        units,
        intent.amountCents,
        today,
        lockedUntil,
      );
      insert.run({
        ...base,
        filled_cents: intent.amountCents,
        units,
        price,
        status: "filled",
        settle_on: today,
        window_on: null,
      });
    } else if (product.liquidity.redemption === "quarterly") {
      const units = intent.amountCents / 100 / price;
      const windowOn = nextRedemptionWindow(today, product.liquidity.noticeDays);
      insert.run({
        ...base,
        filled_cents: 0,
        units,
        price,
        status: "queued",
        settle_on: null,
        window_on: windowOn,
      });
    } else {
      const units = removeUnitsFifo(db, product.id, intent.amountCents / 100 / price, today);
      const proceeds = Math.round(units * price * 100);
      const settleOn = addDays(today, product.liquidity.settlementDays);
      const instant = product.liquidity.settlementDays === 0;
      if (instant) adjustCash(db, proceeds);
      insert.run({
        ...base,
        filled_cents: proceeds,
        units,
        price,
        status: instant ? "settled" : "settling",
        settle_on: settleOn,
        window_on: null,
      });
    }

    const order = getOrder(db, id)!;
    logEvent(db, {
      runId: opts.runId,
      agent: actor,
      kind: "order",
      title: describeOrder(order),
      payload: { orderId: id, autonomous: !!opts.autonomous, proposalId: opts.proposalId ?? null },
    });
    recordNav(db);
    return order;
  });
  return run();
}

export function describeOrder(order: OrderRecord): string {
  const product = requireProduct(order.productId);
  const verb =
    order.side === "buy"
      ? "Bought"
      : order.status === "queued"
        ? "Requested redemption of"
        : "Sold";
  const amount = formatUsd(order.filledCents || order.amountCents);
  const tail =
    order.status === "queued"
      ? ` (queued for the ${order.windowOn} window)`
      : order.status === "settling"
        ? ` (settles ${order.settleOn})`
        : "";
  return `${verb} ${amount} of ${product.name}${tail}`;
}

/** Removes units from the oldest unlocked lots first. Returns the units actually removed. */
export function removeUnitsFifo(db: Db, productId: string, units: number, today: string): number {
  const lots = db
    .prepare(
      `SELECT id, units, cost_cents FROM lots WHERE investor_id = ? AND product_id = ? AND units > 1e-9
       AND (locked_until IS NULL OR locked_until <= ?) ORDER BY acquired_on, id`,
    )
    .all(DEMO_INVESTOR_ID, productId, today) as { id: string; units: number; cost_cents: number }[];
  let remaining = units;
  for (const lot of lots) {
    if (remaining <= 1e-12) break;
    const take = Math.min(lot.units, remaining);
    const costShare = Math.round((lot.cost_cents * take) / lot.units);
    db.prepare("UPDATE lots SET units = units - ?, cost_cents = cost_cents - ? WHERE id = ?").run(
      take,
      costShare,
      lot.id,
    );
    remaining -= take;
  }
  db.prepare("DELETE FROM lots WHERE investor_id = ? AND units <= 1e-9").run(DEMO_INVESTOR_ID);
  return units - Math.max(0, remaining);
}

export function cancelOrder(db: Db, id: string): OrderRecord {
  const order = getOrder(db, id);
  if (!order) throw new Error("Order not found");
  if (order.status !== "queued")
    throw new Error("Only queued redemption requests can be cancelled");
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id);
  logEvent(db, {
    agent: "user",
    kind: "order",
    title: `Cancelled redemption request for ${requireProduct(order.productId).name}`,
  });
  return getOrder(db, id)!;
}

// ── Cash ─────────────────────────────────────────────────────────────────────

export interface CashMovement {
  id: string;
  kind: "deposit" | "withdrawal";
  amountCents: number;
  status: "settled" | "settling";
  createdOn: string;
  settleOn: string;
}

export function deposit(db: Db, amountCents: number): CashMovement {
  if (!Number.isInteger(amountCents) || amountCents <= 0)
    throw new Error("Deposit must be a positive amount");
  if (amountCents > 10_000_000_00) throw new Error("Deposits are limited to $10M in the demo");
  const today = simDate(db);
  const id = newId("cash");
  db.transaction(() => {
    adjustCash(db, amountCents);
    db.prepare(
      "INSERT INTO cash_movements (id, investor_id, kind, amount_cents, status, created_on, settle_on, created_at) VALUES (?, ?, 'deposit', ?, 'settled', ?, ?, ?)",
    ).run(id, DEMO_INVESTOR_ID, amountCents, today, today, nowIso());
    logEvent(db, { agent: "user", kind: "system", title: `Deposited ${formatUsd(amountCents)}` });
    recordNav(db);
  })();
  return { id, kind: "deposit", amountCents, status: "settled", createdOn: today, settleOn: today };
}

/**
 * Withdrawals to a bank account are a human-only action. No agent tool can call
 * this, by design (see docs/research: the Step Finance incident).
 */
export function withdraw(db: Db, amountCents: number): CashMovement {
  if (!Number.isInteger(amountCents) || amountCents <= 0)
    throw new Error("Withdrawal must be a positive amount");
  const cash = getCash(db);
  if (amountCents > cash) throw new Error(`Only ${formatUsd(cash)} is available to withdraw`);
  const today = simDate(db);
  const settleOn = addDays(today, 1);
  const id = newId("cash");
  db.transaction(() => {
    adjustCash(db, -amountCents);
    db.prepare(
      "INSERT INTO cash_movements (id, investor_id, kind, amount_cents, status, created_on, settle_on, created_at) VALUES (?, ?, 'withdrawal', ?, 'settling', ?, ?, ?)",
    ).run(id, DEMO_INVESTOR_ID, amountCents, today, settleOn, nowIso());
    logEvent(db, {
      agent: "user",
      kind: "system",
      title: `Withdrawal of ${formatUsd(amountCents)} to bank (arrives ${settleOn})`,
    });
    recordNav(db);
  })();
  return { id, kind: "withdrawal", amountCents, status: "settling", createdOn: today, settleOn };
}

export function listCashMovements(db: Db, limit = 50): CashMovement[] {
  return db
    .prepare(
      `SELECT id, kind, amount_cents AS amountCents, status, created_on AS createdOn, settle_on AS settleOn
       FROM cash_movements WHERE investor_id = ? ORDER BY created_on DESC, created_at DESC LIMIT ?`,
    )
    .all(DEMO_INVESTOR_ID, limit) as CashMovement[];
}
