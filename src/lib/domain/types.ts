/** Core domain types shared by the services, the agents and the UI. */

export type Sleeve = "cash" | "index" | "trading" | "bitcoin" | "business" | "private";
export type InvestableSleeve = Exclude<Sleeve, "cash">;

export const SLEEVES: readonly Sleeve[] = [
  "cash",
  "index",
  "trading",
  "bitcoin",
  "business",
  "private",
] as const;

export const ILLIQUID_SLEEVES: readonly Sleeve[] = ["business", "private"] as const;

export type RiskProfileId = "conservative" | "balanced" | "growth" | "aggressive";

/**
 * How an investor gets money back out of a product.
 * - instant:   sells settle the same day (e.g. bitcoin)
 * - daily:     sells settle after `settlementDays`
 * - quarterly: redemption requests queue for the next quarter-end window, subject to a gate
 * - locked:    nothing can be sold until the lot's lock-up ends
 */
export type RedemptionKind = "instant" | "daily" | "quarterly" | "locked";

export interface LiquidityTerms {
  redemption: RedemptionKind;
  /** Days from a filled sell to cash landing in the account. */
  settlementDays: number;
  /** Quarterly funds: a request must be in this many days before the window. */
  noticeDays: number;
  /** Each lot is locked for this many months after purchase. */
  lockupMonths: number;
  /** Quarterly funds: max share of fund NAV redeemed per window (e.g. 0.05). */
  gatePct: number | null;
}

export type ValuationSource = "market" | "independent" | "originator";

export interface Product {
  id: string;
  name: string;
  sleeve: InvestableSleeve;
  kind: "fund" | "asset" | "deal";
  tagline: string;
  description: string;
  liquidity: LiquidityTerms;
  /** Where the price comes from: a traded market or a periodic appraisal. */
  valuation: {
    source: ValuationSource;
    appraiser: string | null;
    /** Appraised products are re-marked every N days. */
    everyDays: number | null;
  };
  /** Expected annual return used by the market simulation. */
  annualDrift: number;
  /** Annual volatility used by the market simulation. */
  annualVol: number;
  /** Loading on the common market factor (0..1). */
  marketCorrelation: number;
  startPrice: number;
  minTicketCents: number;
  status: "open" | "closed";
}

export type DealStructure = "senior_secured" | "unsecured" | "equity" | "revenue_share";

/** Facts about a private deal that Scout uses for diligence. */
export interface DealFacts {
  productId: string;
  originator: string;
  sector: string;
  structure: DealStructure;
  termMonths: number;
  targetYieldPct: number;
  targetRaiseCents: number;
  auditedFinancials: boolean;
  relatedParty: boolean;
  /** Proceeds are used to service or refinance the originator's other debt. */
  circularFinancing: boolean;
  independentValuation: boolean;
  /** Share of the platform's private book already exposed to this originator. */
  originatorExposurePct: number;
  /** Net debt / EBITDA. Null for pure equity. */
  leverage: number | null;
  /** The liquidity promised to investors, compared with the asset's term. */
  offeredLiquidity: RedemptionKind;
  trackRecordYears: number;
  summary: string;
}

export interface Lot {
  id: string;
  productId: string;
  units: number;
  costCents: number;
  acquiredOn: string;
  lockedUntil: string | null;
}

export interface PricePoint {
  date: string;
  price: number;
  source: ValuationSource;
}

export interface Holding {
  product: Product;
  units: number;
  price: number;
  priceDate: string;
  valueCents: number;
  costCents: number;
  lockedValueCents: number;
  nextUnlock: string | null;
  weight: number;
}

export interface PortfolioSnapshot {
  date: string;
  cashCents: number;
  /** Sale proceeds and redemptions that are on their way but not yet usable. */
  pendingCashCents: number;
  investedCents: number;
  totalCents: number;
  holdings: Holding[];
  sleeves: Record<Sleeve, { valueCents: number; weight: number }>;
}

export type AgentId = "atlas" | "quant" | "scout" | "ledger" | "sentinel" | "copilot";

/** Who initiated an action. Agents are distinguished so the audit log can attribute them. */
export type Actor = "user" | "autopilot" | AgentId;

export interface OrderIntent {
  productId: string;
  side: "buy" | "sell";
  amountCents: number;
}

export type CheckStatus = "pass" | "warn" | "block";

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export type AutonomyMode = "propose" | "bounded";

/** Limits that apply to anything an agent does without a human approving it first. */
export interface AgentMandate {
  autonomy: AutonomyMode;
  autoExecuteLimitCents: number;
  agentBudgetCents: number;
  perOrderCapCents: number;
  dailyCapCents: number;
  maxOrdersPerDay: number;
  allowedSleeves: InvestableSleeve[];
  readOnly: boolean;
  killSwitch: boolean;
  killReason: string | null;
  circuitBreakerPct: number;
  disabledAgents: AgentId[];
}

export type Severity = "info" | "warn" | "critical";
