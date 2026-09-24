import type { Db } from "@/lib/db";
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

/** Low-level reads and writes shared by the services. Everything is scoped to one investor. */

export type InvestorKind = "user" | "guest" | "demo";

export interface Investor {
  id: string;
  kind: InvestorKind;
  name: string;
  email: string | null;
  riskProfile: RiskProfileId;
  kycStatus: "verified" | "pending";
  createdAt: string;
}

interface InvestorRow {
  id: string;
  kind: InvestorKind;
  name: string;
  email: string | null;
  risk_profile: RiskProfileId;
  kyc_status: "verified" | "pending";
  created_at: string;
}

function mapInvestor(row: InvestorRow): Investor {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    email: row.email,
    riskProfile: row.risk_profile,
    kycStatus: row.kyc_status,
    createdAt: row.created_at,
  };
}

export function findInvestor(db: Db, investorId: string): Investor | null {
  const row = db.prepare("SELECT * FROM investors WHERE id = ?").get(investorId) as
    InvestorRow | undefined;
  return row ? mapInvestor(row) : null;
}

export function getInvestor(db: Db, investorId: string): Investor {
  const investor = findInvestor(db, investorId);
  if (!investor) throw new Error("Investor not found");
  return investor;
}

export function listInvestorIds(db: Db): string[] {
  return (db.prepare("SELECT id FROM investors ORDER BY created_at").all() as { id: string }[]).map(
    (r) => r.id,
  );
}

export function getProfile(db: Db, investorId: string): RiskProfile {
  return getRiskProfile(getInvestor(db, investorId).riskProfile);
}

export function setRiskProfile(db: Db, investorId: string, profile: RiskProfileId): void {
  db.prepare("UPDATE investors SET risk_profile = ? WHERE id = ?").run(profile, investorId);
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

export const DEFAULT_MANDATE: AgentMandate = {
  autonomy: "propose",
  autoExecuteLimitCents: 2_500_00,
  agentBudgetCents: 25_000_00,
  perOrderCapCents: 10_000_00,
  dailyCapCents: 25_000_00,
  maxOrdersPerDay: 10,
  allowedSleeves: ["index", "trading", "bitcoin"],
  readOnly: false,
  killSwitch: false,
  killReason: null,
  circuitBreakerPct: 0.05,
  disabledAgents: [],
};

export function getMandate(db: Db, investorId: string): AgentMandate {
  const r = db
    .prepare("SELECT * FROM mandates WHERE investor_id = ?")
    .get(investorId) as MandateRow;
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

export function insertMandate(db: Db, investorId: string, m: AgentMandate = DEFAULT_MANDATE): void {
  db.prepare(
    `INSERT INTO mandates (investor_id, autonomy, auto_execute_limit_cents, agent_budget_cents, per_order_cap_cents,
      daily_cap_cents, max_orders_per_day, allowed_sleeves, read_only, kill_switch, kill_reason, circuit_breaker_pct, disabled_agents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    investorId,
    m.autonomy,
    m.autoExecuteLimitCents,
    m.agentBudgetCents,
    m.perOrderCapCents,
    m.dailyCapCents,
    m.maxOrdersPerDay,
    JSON.stringify(m.allowedSleeves),
    m.readOnly ? 1 : 0,
    m.killSwitch ? 1 : 0,
    m.killReason,
    m.circuitBreakerPct,
    JSON.stringify(m.disabledAgents),
  );
}

export function updateMandate(
  db: Db,
  investorId: string,
  patch: Partial<AgentMandate>,
): AgentMandate {
  const m = { ...getMandate(db, investorId), ...patch };
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
    investorId,
  );
  return getMandate(db, investorId);
}

export function getCash(db: Db, investorId: string): number {
  const row = db
    .prepare("SELECT cash_cents FROM accounts WHERE investor_id = ?")
    .get(investorId) as { cash_cents: number };
  return row.cash_cents;
}

export function adjustCash(db: Db, investorId: string, deltaCents: number): void {
  db.prepare("UPDATE accounts SET cash_cents = cash_cents + ? WHERE investor_id = ?").run(
    deltaCents,
    investorId,
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

export function getLots(db: Db, investorId: string): Lot[] {
  const rows = db
    .prepare("SELECT * FROM lots WHERE investor_id = ? AND units > 1e-9 ORDER BY acquired_on, id")
    .all(investorId) as LotRow[];
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
export function reservedUnits(db: Db, investorId: string): Map<string, number> {
  const rows = db
    .prepare(
      "SELECT product_id, SUM(units) AS units FROM orders WHERE investor_id = ? AND status = 'queued' GROUP BY product_id",
    )
    .all(investorId) as { product_id: string; units: number }[];
  return new Map(rows.map((r) => [r.product_id, r.units]));
}

/** Lots minus units reserved by queued redemptions (FIFO). What can still be sold. */
export function getAvailableLots(db: Db, investorId: string): Lot[] {
  const reserved = reservedUnits(db, investorId);
  return getLots(db, investorId).map((lot) => {
    const r = reserved.get(lot.productId) ?? 0;
    if (r <= 0) return lot;
    const take = Math.min(r, lot.units);
    reserved.set(lot.productId, r - take);
    return { ...lot, units: lot.units - take };
  });
}

// ── Shared market data ──────────────────────────────────────────────────────

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
  return db
    .prepare(
      "SELECT date, price, source FROM prices WHERE product_id = ? AND date >= ? ORDER BY date",
    )
    .all(productId, fromDate ?? "0000-00-00") as PricePoint[];
}

export function currentPrice(db: Db, productId: string, date: string): number | null {
  const row = db
    .prepare(
      "SELECT price FROM prices WHERE product_id = ? AND date <= ? ORDER BY date DESC LIMIT 1",
    )
    .get(productId, date) as { price: number } | undefined;
  return row?.price ?? null;
}
