import type { DealFacts, InvestableSleeve, LiquidityTerms, Product } from "./types";

/**
 * The product shelf. Everything here is fictional and simulated. Prices come from
 * the deterministic market simulation in `market.ts`, not from real markets.
 */

const DAILY_T1: LiquidityTerms = {
  redemption: "daily",
  settlementDays: 1,
  noticeDays: 0,
  lockupMonths: 0,
  gatePct: null,
};

const INDEPENDENT = "Northbridge Valuation Partners (independent)";

export const PRODUCTS: Product[] = [
  // ── Index funds ──────────────────────────────────────────────────────────
  {
    id: "MLWX",
    name: "Global Equity Index",
    sleeve: "index",
    kind: "fund",
    tagline: "3,000+ companies across 47 markets",
    description:
      "A low-cost fund tracking a global all-cap equity index. This is the core of most MyLiquid portfolios.",
    liquidity: DAILY_T1,
    valuation: { source: "market", appraiser: null, everyDays: null },
    annualDrift: 0.07,
    annualVol: 0.15,
    marketCorrelation: 0.95,
    startPrice: 100,
    minTicketCents: 1_00,
    status: "open",
  },
  {
    id: "MLUS",
    name: "US Large Cap 500 Index",
    sleeve: "index",
    kind: "fund",
    tagline: "The 500 largest US companies",
    description: "Tracks a US large-cap benchmark. Daily liquidity with T+1 settlement.",
    liquidity: DAILY_T1,
    valuation: { source: "market", appraiser: null, everyDays: null },
    annualDrift: 0.08,
    annualVol: 0.17,
    marketCorrelation: 0.92,
    startPrice: 250,
    minTicketCents: 1_00,
    status: "open",
  },
  {
    id: "MLBD",
    name: "Global Aggregate Bond Index",
    sleeve: "index",
    kind: "fund",
    tagline: "Investment-grade government and corporate bonds",
    description: "Ballast for the portfolio. Low volatility, daily liquidity.",
    liquidity: DAILY_T1,
    valuation: { source: "market", appraiser: null, everyDays: null },
    annualDrift: 0.035,
    annualVol: 0.05,
    marketCorrelation: 0.2,
    startPrice: 50,
    minTicketCents: 1_00,
    status: "open",
  },
  // ── Active trading ───────────────────────────────────────────────────────
  {
    id: "MLQM",
    name: "Quant Momentum Strategy",
    sleeve: "trading",
    kind: "fund",
    tagline: "Systematic trend-following, run by the Quant agent",
    description:
      "A rules-based strategy that tilts toward assets in an uptrend and cuts exposure in drawdowns. Its signals are visible on the Agents page.",
    liquidity: DAILY_T1,
    valuation: { source: "market", appraiser: null, everyDays: null },
    annualDrift: 0.09,
    annualVol: 0.2,
    marketCorrelation: 0.6,
    startPrice: 20,
    minTicketCents: 1_00,
    status: "open",
  },
  // ── Bitcoin ──────────────────────────────────────────────────────────────
  {
    id: "BTC",
    name: "Bitcoin",
    sleeve: "bitcoin",
    kind: "asset",
    tagline: "Trades 24/7, settles instantly",
    description:
      "Direct bitcoin exposure held with a qualified custodian. Very volatile, so position size is capped by your risk profile.",
    liquidity: {
      redemption: "instant",
      settlementDays: 0,
      noticeDays: 0,
      lockupMonths: 0,
      gatePct: null,
    },
    valuation: { source: "market", appraiser: null, everyDays: null },
    annualDrift: 0.2,
    annualVol: 0.55,
    marketCorrelation: 0.35,
    startPrice: 62_000,
    minTicketCents: 1_00,
    status: "open",
  },
  // ── Business interests ───────────────────────────────────────────────────
  {
    id: "MLMS",
    name: "Main Street Revenue Share Fund",
    sleeve: "business",
    kind: "fund",
    tagline: "Revenue-based financing for 400+ small businesses",
    description:
      "A pooled fund that finances profitable small businesses in exchange for a share of revenue. Quarterly redemptions with 90 days' notice and a 5% gate. We say that plainly rather than call it liquid.",
    liquidity: {
      redemption: "quarterly",
      settlementDays: 5,
      noticeDays: 90,
      lockupMonths: 12,
      gatePct: 0.05,
    },
    valuation: { source: "independent", appraiser: INDEPENDENT, everyDays: 30 },
    annualDrift: 0.1,
    annualVol: 0.04,
    marketCorrelation: 0,
    startPrice: 10,
    minTicketCents: 1_000_00,
    status: "open",
  },
  {
    id: "DL-BAKE",
    name: "Bakehouse Collective Revenue Share",
    sleeve: "business",
    kind: "deal",
    tagline: "Regional bakery chain, 14 locations",
    description: "A revenue-share note financing four new locations. 36-month term.",
    liquidity: {
      redemption: "locked",
      settlementDays: 5,
      noticeDays: 0,
      lockupMonths: 36,
      gatePct: null,
    },
    valuation: { source: "independent", appraiser: INDEPENDENT, everyDays: 30 },
    annualDrift: 0.12,
    annualVol: 0.06,
    marketCorrelation: 0,
    startPrice: 100,
    minTicketCents: 2_500_00,
    status: "open",
  },
  {
    id: "DL-CEDAR",
    name: "Cedar & Pine Family Business Stake",
    sleeve: "business",
    kind: "deal",
    tagline: "Minority stake in a third-generation furniture maker",
    description:
      "A 12% minority equity stake alongside the founding family. Appraised quarterly, so marks can be up to 90 days old.",
    liquidity: {
      redemption: "locked",
      settlementDays: 5,
      noticeDays: 0,
      lockupMonths: 60,
      gatePct: null,
    },
    valuation: { source: "independent", appraiser: INDEPENDENT, everyDays: 90 },
    annualDrift: 0.11,
    annualVol: 0.1,
    marketCorrelation: 0,
    startPrice: 100,
    minTicketCents: 5_000_00,
    status: "open",
  },
  // ── Private equity & private credit ──────────────────────────────────────
  {
    id: "MLPC",
    name: "Private Credit Fund I",
    sleeve: "private",
    kind: "fund",
    tagline: "Senior secured loans to mid-market companies",
    description:
      "A diversified book of senior secured loans. No originator above 5% of the fund. Five-year lock-up with no redemptions before then, and we tell you that before you invest.",
    liquidity: {
      redemption: "locked",
      settlementDays: 10,
      noticeDays: 0,
      lockupMonths: 60,
      gatePct: null,
    },
    valuation: { source: "independent", appraiser: INDEPENDENT, everyDays: 30 },
    annualDrift: 0.095,
    annualVol: 0.03,
    marketCorrelation: 0,
    startPrice: 10,
    minTicketCents: 5_000_00,
    status: "open",
  },
  {
    id: "MLGE",
    name: "Growth Equity Fund II",
    sleeve: "private",
    kind: "fund",
    tagline: "Minority stakes in profitable growth companies",
    description:
      "A private equity fund with a seven-year lock-up, marked monthly by an independent appraiser.",
    liquidity: {
      redemption: "locked",
      settlementDays: 10,
      noticeDays: 0,
      lockupMonths: 84,
      gatePct: null,
    },
    valuation: { source: "independent", appraiser: INDEPENDENT, everyDays: 30 },
    annualDrift: 0.13,
    annualVol: 0.12,
    marketCorrelation: 0,
    startPrice: 10,
    minTicketCents: 10_000_00,
    status: "open",
  },
  {
    id: "DL-HARBOR",
    name: "Harbor Logistics Senior Loan",
    sleeve: "private",
    kind: "deal",
    tagline: "First-lien loan to a cold-chain logistics operator",
    description: "A senior secured, first-lien term loan with audited financials. 48-month term.",
    liquidity: {
      redemption: "locked",
      settlementDays: 10,
      noticeDays: 0,
      lockupMonths: 48,
      gatePct: null,
    },
    valuation: { source: "independent", appraiser: INDEPENDENT, everyDays: 30 },
    annualDrift: 0.105,
    annualVol: 0.03,
    marketCorrelation: 0,
    startPrice: 100,
    minTicketCents: 2_500_00,
    status: "open",
  },
  {
    id: "DL-SOLAR",
    name: "Solaris Rooftop Solar Notes",
    sleeve: "private",
    kind: "deal",
    tagline: "Asset-backed notes on 2,100 commercial rooftop installs",
    description: "Senior secured notes backed by contracted solar revenues. 60-month term.",
    liquidity: {
      redemption: "locked",
      settlementDays: 10,
      noticeDays: 0,
      lockupMonths: 60,
      gatePct: null,
    },
    valuation: { source: "independent", appraiser: INDEPENDENT, everyDays: 30 },
    annualDrift: 0.09,
    annualVol: 0.025,
    marketCorrelation: 0,
    startPrice: 100,
    minTicketCents: 2_500_00,
    status: "open",
  },
  {
    id: "DL-VERDANT",
    name: "Verdant Clinics Growth Equity",
    sleeve: "private",
    kind: "deal",
    tagline: "Growth capital for a network of outpatient clinics",
    description:
      "A co-investment in a growth equity round led by an institutional sponsor. 84-month horizon.",
    liquidity: {
      redemption: "locked",
      settlementDays: 10,
      noticeDays: 0,
      lockupMonths: 84,
      gatePct: null,
    },
    valuation: { source: "independent", appraiser: INDEPENDENT, everyDays: 30 },
    annualDrift: 0.14,
    annualVol: 0.14,
    marketCorrelation: 0,
    startPrice: 100,
    minTicketCents: 5_000_00,
    status: "open",
  },
  {
    // The cautionary tale. Scout should reject it. See docs/research.
    id: "DL-NORDHAVN",
    name: "Nordhavn Shipyard Bond",
    sleeve: "private",
    kind: "deal",
    tagline: "18% coupon, quarterly liquidity (promised)",
    description:
      "A bespoke bond from a holding group with interests in a shipyard, a football club and a tech firm. Marked by the originator.",
    liquidity: {
      redemption: "locked",
      settlementDays: 10,
      noticeDays: 0,
      lockupMonths: 84,
      gatePct: null,
    },
    valuation: { source: "originator", appraiser: "Nordhavn Holding (originator)", everyDays: 30 },
    annualDrift: 0.18,
    annualVol: 0,
    marketCorrelation: 0,
    startPrice: 100,
    minTicketCents: 1_000_00,
    status: "open",
  },
];

export const DEALS: DealFacts[] = [
  {
    productId: "DL-HARBOR",
    originator: "Harbor Logistics Group",
    sector: "Logistics",
    structure: "senior_secured",
    termMonths: 48,
    targetYieldPct: 10.5,
    targetRaiseCents: 12_000_000_00,
    auditedFinancials: true,
    relatedParty: false,
    circularFinancing: false,
    independentValuation: true,
    originatorExposurePct: 2.1,
    leverage: 3.4,
    offeredLiquidity: "locked",
    trackRecordYears: 11,
    summary:
      "Cold-chain operator with 9 years of audited statements. First-lien on warehouses and fleet; lender-friendly covenants.",
  },
  {
    productId: "DL-SOLAR",
    originator: "Solaris Energy Finance",
    sector: "Renewable energy",
    structure: "senior_secured",
    termMonths: 60,
    targetYieldPct: 9,
    targetRaiseCents: 20_000_000_00,
    auditedFinancials: true,
    relatedParty: false,
    circularFinancing: false,
    independentValuation: true,
    originatorExposurePct: 3.2,
    leverage: 4.8,
    offeredLiquidity: "locked",
    trackRecordYears: 7,
    summary:
      "Contracted 20-year power purchase agreements with investment-grade offtakers back the notes.",
  },
  {
    productId: "DL-VERDANT",
    originator: "Verdant Health Partners",
    sector: "Healthcare",
    structure: "equity",
    termMonths: 84,
    targetYieldPct: 14,
    targetRaiseCents: 30_000_000_00,
    auditedFinancials: true,
    relatedParty: false,
    circularFinancing: false,
    independentValuation: true,
    originatorExposurePct: 1.5,
    leverage: null,
    offeredLiquidity: "locked",
    trackRecordYears: 6,
    summary:
      "An institutional sponsor leads the round. MyLiquid co-invests on the same terms, with no extra fees.",
  },
  {
    productId: "DL-BAKE",
    originator: "Bakehouse Collective",
    sector: "Food & hospitality",
    structure: "revenue_share",
    termMonths: 36,
    targetYieldPct: 12,
    targetRaiseCents: 1_500_000_00,
    auditedFinancials: false,
    relatedParty: false,
    circularFinancing: false,
    independentValuation: true,
    originatorExposurePct: 0.8,
    leverage: 2.1,
    offeredLiquidity: "locked",
    trackRecordYears: 4,
    summary:
      "Profitable regional chain. Financials are reviewed by a CPA but not audited, so it is priced for that.",
  },
  {
    productId: "DL-CEDAR",
    originator: "Cedar & Pine Furniture Co.",
    sector: "Manufacturing",
    structure: "equity",
    termMonths: 60,
    targetYieldPct: 11,
    targetRaiseCents: 4_000_000_00,
    auditedFinancials: true,
    relatedParty: false,
    circularFinancing: false,
    independentValuation: true,
    originatorExposurePct: 1.2,
    leverage: 1.8,
    offeredLiquidity: "locked",
    trackRecordYears: 38,
    summary:
      "A third-generation family business raising minority growth capital for a second plant.",
  },
  {
    productId: "DL-NORDHAVN",
    originator: "Nordhavn Holding",
    sector: "Conglomerate (shipyard, football club, tech)",
    structure: "unsecured",
    termMonths: 84,
    targetYieldPct: 18,
    targetRaiseCents: 250_000_000_00,
    auditedFinancials: false,
    relatedParty: true,
    circularFinancing: true,
    independentValuation: false,
    originatorExposurePct: 22,
    leverage: 9.5,
    offeredLiquidity: "quarterly",
    trackRecordYears: 2,
    summary:
      "Proceeds would partly refinance coupons on the group's earlier bonds. The originator marks the bond itself and promises quarterly liquidity on a 7-year asset.",
  },
];

const PRODUCT_INDEX = new Map(PRODUCTS.map((p) => [p.id, p]));
const DEAL_INDEX = new Map(DEALS.map((d) => [d.productId, d]));

export function getProduct(id: string): Product | undefined {
  return PRODUCT_INDEX.get(id);
}

export function requireProduct(id: string): Product {
  const product = PRODUCT_INDEX.get(id);
  if (!product) throw new Error(`Unknown product: ${id}`);
  return product;
}

export function getDealFacts(productId: string): DealFacts | undefined {
  return DEAL_INDEX.get(productId);
}

/** The product Atlas uses to add or trim exposure to a liquid sleeve. */
export const CORE_PRODUCT_BY_SLEEVE: Partial<Record<InvestableSleeve, string>> = {
  index: "MLWX",
  trading: "MLQM",
  bitcoin: "BTC",
  business: "MLMS",
  private: "MLPC",
};

export const SLEEVE_LABELS: Record<InvestableSleeve | "cash", string> = {
  cash: "Cash",
  index: "Index funds",
  trading: "Active trading",
  bitcoin: "Bitcoin",
  business: "Business interests",
  private: "Private equity & credit",
};

export function isLiquid(product: Product): boolean {
  return product.liquidity.redemption === "instant" || product.liquidity.redemption === "daily";
}
