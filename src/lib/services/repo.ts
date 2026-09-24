import { DEMO_INVESTOR_ID, type Db } from "@/lib/db";
import { getRiskProfile, type RiskProfile } from "@/lib/domain/profiles";
import type {
  AgentId,
  AgentMandate,
  InvestableSleeve,
  Lot,
  PricePoint,
  RiskProfileId,
  ValuationSource,
} from "@/lib/domain/types";

/** Low-level reads and writes shared by the services. */

export interface Investor {
  id: string;
  name: string;
  email: string;
  riskProfile: RiskProfileId;
  kycStatus: "verified" | "pending";
}

export function getInvestor(db: Db): Investor {
  const row = db.prepare("SELECT * FROM investors WHERE id = ?").get(DEMO_INVESTOR_ID) as {
    id: string;
    name: string;
    email: string;
    risk_profile: RiskProfileId;
    kyc_status: "verified" | "pending";
  };
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    riskProfile: row.risk_profile,
    kycStatus: row.kyc_status,
  };
}

export function getProfile(db: Db): RiskProfile {
  return getRiskProfile(getInvestor(db).riskProfile);
}

export function setRiskProfile(db: Db, profile: RiskProfileId): void {
  db.prepare("UPDATE investors SET risk_profile = ? WHERE id = ?").run(profile, DEMO_INVESTOR_ID);
}

interface MandateRow {
  autonomy: "propose" | "bounded";
  auto_execute_limit_cents: number;
  agent_budget_cents: number;
  per_order_cap_cents: number;
  daily_cap_cents: number;
  max_orders_per_day: number;
  allowed_sleeves: string;
  read_only: number;
  kill_switch: number;
  kill_reason: string | null;
  circuit_breaker_pct: number;
  disabled_agents: string;
}

export function getMandate(db: Db): AgentMandate {
  const r = db
    .prepare("SELECT * FROM mandates WHERE investor_id = ?")
    .get(DEMO_INVESTOR_ID) as MandateRow;
  return {
    autonomy: r.autonomy,
    autoExecuteLimitCents: r.auto_execute_limit_cents,
    agentBudgetCents: r.agent_budget_cents,
    perOrderCapCents: r.per_order_cap_cents,
    dailyCapCents: r.daily_cap_cents,
    maxOrdersPerDay: r.max_orders_per_day,
    allowedSleeves: JSON.parse(r.allowed_sleeves) as InvestableSleeve[],
    readOnly: r.read_only === 1,
    killSwitch: r.kill_switch === 1,
    killReason: r.kill_reason,
    circuitBreakerPct: r.circuit_breaker_pct,
    disabledAgents: JSON.parse(r.disabled_agents) as AgentId[],
  };
}

export function updateMandate(db: Db, patch: Partial<AgentMandate>): AgentMandate {
  const m = { ...getMandate(db), ...patch };
  db.prepare(
    `UPDATE mandates SET autonomy = ?, auto_execute_limit_cents = ?, agent_budget_cents = ?, per_order_cap_cents = ?,
      daily_cap_cents = ?, max_orders_per_day = ?, allowed_sleeves = ?, read_only = ?, kill_switch = ?, kill_reason = ?,
      circuit_breaker_pct = ?, disabled_agents = ? WHERE investor_id = ?`,
  ).run(
    m.autonomy,
    m.autoExecuteLimitCents,
    m.agentBudgetCents,
    m.perOrderCapCents,
    m.dailyCapCents,
    m.maxOrdersPerDay,
    JSON.stringify(m.allowedSleeves),
    m.readOnly ? 1 : 0,
    m.killSwitch ? 1 : 0,
    m.killSwitch ? m.killReason : null,
    m.circuitBreakerPct,
    JSON.stringify(m.disabledAgents),
    DEMO_INVESTOR_ID,
  );
  return m;
}

export function getCash(db: Db): number {
  const row = db
    .prepare("SELECT cash_cents FROM accounts WHERE investor_id = ?")
    .get(DEMO_INVESTOR_ID) as {
    cash_cents: number;
  };
  return row.cash_cents;
}

export function adjustCash(db: Db, deltaCents: number): void {
  db.prepare("UPDATE accounts SET cash_cents = cash_cents + ? WHERE investor_id = ?").run(
    deltaCents,
    DEMO_INVESTOR_ID,
  );
}

interface LotRow {
  id: string;
  product_id: string;
  units: number;
  cost_cents: number;
  acquired_on: string;
  locked_until: string | null;
}

export function getLots(db: Db): Lot[] {
  const rows = db
    .prepare("SELECT * FROM lots WHERE investor_id = ? AND units > 1e-9 ORDER BY acquired_on, id")
    .all(DEMO_INVESTOR_ID) as LotRow[];
  return rows.map((r) => ({
    id: r.id,
    productId: r.product_id,
    units: r.units,
    costCents: r.cost_cents,
    acquiredOn: r.acquired_on,
    lockedUntil: r.locked_until,
  }));
}

/** Units already promised to queued redemption requests, per product. */
export function reservedUnits(db: Db): Map<string, number> {
  const rows = db
    .prepare(
      "SELECT product_id, SUM(units) AS units FROM orders WHERE investor_id = ? AND status = 'queued' GROUP BY product_id",
    )
    .all(DEMO_INVESTOR_ID) as { product_id: string; units: number }[];
  return new Map(rows.map((r) => [r.product_id, r.units]));
}

/** Lots minus units reserved by queued redemptions (FIFO). What can still be sold. */
export function getAvailableLots(db: Db): Lot[] {
  const reserved = reservedUnits(db);
  return getLots(db).map((lot) => {
    const r = reserved.get(lot.productId) ?? 0;
    if (r <= 0) return lot;
    const take = Math.min(r, lot.units);
    reserved.set(lot.productId, r - take);
    return { ...lot, units: lot.units - take };
  });
}

export function latestPrices(db: Db, onOrBefore: string): Map<string, PricePoint> {
  const rows = db
    .prepare(
      `SELECT p.product_id, p.date, p.price, p.source FROM prices p
       JOIN (SELECT product_id, MAX(date) AS date FROM prices WHERE date <= ? GROUP BY product_id) m
         ON m.product_id = p.product_id AND m.date = p.date`,
    )
    .all(onOrBefore) as {
    product_id: string;
    date: string;
    price: number;
    source: ValuationSource;
  }[];
  return new Map(
    rows.map((r) => [r.product_id, { date: r.date, price: r.price, source: r.source }]),
  );
}

export function priceHistory(db: Db, productId: string, fromDate?: string): PricePoint[] {
  const rows = db
    .prepare(
      "SELECT date, price, source FROM prices WHERE product_id = ? AND date >= ? ORDER BY date",
    )
    .all(productId, fromDate ?? "0000-00-00") as PricePoint[];
  return rows;
}

export function currentPrice(db: Db, productId: string, date: string): number | null {
  const row = db
    .prepare(
      "SELECT price FROM prices WHERE product_id = ? AND date <= ? ORDER BY date DESC LIMIT 1",
    )
    .get(productId, date) as { price: number } | undefined;
  return row?.price ?? null;
}
