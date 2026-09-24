import type { CheckResult } from "./types";

/**
 * Agent Pay: the rules for letting an agent spend money in the real world.
 *
 * Modeled on how the card networks shipped agentic payments in 2026 (Mastercard
 * Agent Pay / agentic tokens, Visa Intelligent Commerce): the agent never sees a
 * card number, it holds a token bound to a spending policy, and every payment is
 * checked against that policy before money moves. The funded wallet is the hard
 * ceiling (like Robinhood's agentic account). Pure functions only.
 */

export type MerchantCategory =
  | "coffee"
  | "groceries"
  | "restaurants"
  | "transport"
  | "fuel"
  | "software"
  | "data"
  | "travel"
  | "retail"
  | "gambling";

export const CATEGORY_LABELS: Record<MerchantCategory, string> = {
  coffee: "Coffee",
  groceries: "Groceries",
  restaurants: "Restaurants",
  transport: "Rides & transit",
  fuel: "Fuel",
  software: "Software & AI",
  data: "Data & APIs",
  travel: "Travel",
  retail: "Retail",
  gambling: "Gambling",
};

export const DEFAULT_ALLOWED_CATEGORIES: MerchantCategory[] = [
  "coffee",
  "groceries",
  "restaurants",
  "transport",
  "fuel",
  "software",
  "data",
  "retail",
];

export interface Merchant {
  id: string;
  name: string;
  category: MerchantCategory;
  icon: string;
  location: string;
  /** Typical ticket, used by the terminal demo to suggest an amount. */
  typicalCents: number;
}

export const MERCHANTS: Merchant[] = [
  {
    id: "m_brewlab",
    name: "Brew Lab Coffee",
    category: "coffee",
    icon: "☕",
    location: "Mission St, San Francisco",
    typicalCents: 5_75,
  },
  {
    id: "m_greenmarket",
    name: "Green Market Grocers",
    category: "groceries",
    icon: "🥦",
    location: "Valencia St, San Francisco",
    typicalCents: 64_20,
  },
  {
    id: "m_bowlco",
    name: "Bowl & Co.",
    category: "restaurants",
    icon: "🥗",
    location: "Market St, San Francisco",
    typicalCents: 16_40,
  },
  {
    id: "m_zipride",
    name: "ZipRide",
    category: "transport",
    icon: "🚕",
    location: "Ride-hailing",
    typicalCents: 23_10,
  },
  {
    id: "m_voltfuel",
    name: "Volt Fuel & Charge",
    category: "fuel",
    icon: "⚡",
    location: "Hwy 101, Palo Alto",
    typicalCents: 48_00,
  },
  {
    id: "m_cloudcompute",
    name: "Cloud Compute Credits",
    category: "software",
    icon: "🧠",
    location: "Online",
    typicalCents: 20_00,
  },
  {
    id: "m_northbridge",
    name: "Northbridge Data (x402)",
    category: "data",
    icon: "📊",
    location: "API",
    typicalCents: 50,
  },
  {
    id: "m_skyline",
    name: "Skyline Airways",
    category: "travel",
    icon: "✈️",
    location: "Online",
    typicalCents: 389_00,
  },
  {
    id: "m_pixelstore",
    name: "Pixel Electronics",
    category: "retail",
    icon: "🎧",
    location: "Union Square, San Francisco",
    typicalCents: 129_00,
  },
  {
    id: "m_luckystar",
    name: "Lucky Star Casino",
    category: "gambling",
    icon: "🎰",
    location: "Online",
    typicalCents: 100_00,
  },
];

const MERCHANT_INDEX = new Map(MERCHANTS.map((m) => [m.id, m]));

export function getMerchant(id: string): Merchant | undefined {
  return MERCHANT_INDEX.get(id);
}

export function requireMerchant(id: string): Merchant {
  const m = MERCHANT_INDEX.get(id);
  if (!m) throw new Error(`Unknown merchant ${id}`);
  return m;
}

export interface CardPolicy {
  status: "active" | "frozen";
  perPaymentLimitCents: number;
  approvalThresholdCents: number;
  dailyLimitCents: number;
  monthlyLimitCents: number;
  allowedCategories: MerchantCategory[];
}

export const DEFAULT_CARD_POLICY: CardPolicy = {
  status: "active",
  perPaymentLimitCents: 200_00,
  approvalThresholdCents: 50_00,
  dailyLimitCents: 300_00,
  monthlyLimitCents: 1_500_00,
  allowedCategories: DEFAULT_ALLOWED_CATEGORIES,
};

export interface PaymentContext {
  card: CardPolicy | null;
  walletCents: number;
  spentTodayCents: number;
  spentMonthCents: number;
  paymentsLastHour: number;
  agentsPaused: boolean;
  merchant: Merchant;
  amountCents: number;
  firstTimeMerchant: boolean;
}

export type PaymentDecision = "approve" | "needs_approval" | "decline";

export const MAX_PAYMENT_CENTS = 10_000_00;
export const VELOCITY_LIMIT_PER_HOUR = 5;
export const NEW_MERCHANT_REVIEW_CENTS = 25_00;

const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Checks a payment against the card's policy. Hard rules decline. Soft rules
 * (size, velocity, a new merchant, a sleeping agent) ask the owner first. When the
 * owner has approved, only the hard rules apply.
 */
export function evaluatePayment(
  ctx: PaymentContext,
  opts: { ownerApproved?: boolean } = {},
): { decision: PaymentDecision; checks: CheckResult[] } {
  const checks: CheckResult[] = [];
  const hard = (id: string, label: string, ok: boolean, detail: string, okDetail: string) =>
    checks.push({ id, label, status: ok ? "pass" : "block", detail: ok ? okDetail : detail });
  const soft = (id: string, label: string, ok: boolean, detail: string, okDetail: string) =>
    checks.push({
      id,
      label,
      status: ok || opts.ownerApproved ? "pass" : "warn",
      detail: ok ? okDetail : opts.ownerApproved ? `${detail} Approved by you.` : detail,
    });

  const { card, merchant, amountCents } = ctx;
  hard(
    "card",
    "Agent card",
    !!card && card.status === "active",
    card ? "The agent card is frozen." : "No agent card yet.",
    "Card is active.",
  );
  hard(
    "amount",
    "Amount",
    Number.isInteger(amountCents) && amountCents > 0 && amountCents <= MAX_PAYMENT_CENTS,
    `Amount must be between $0.01 and ${usd(MAX_PAYMENT_CENTS)}.`,
    `${usd(amountCents)} to ${merchant.name}.`,
  );
  if (card) {
    hard(
      "category",
      "Merchant category",
      card.allowedCategories.includes(merchant.category),
      `${CATEGORY_LABELS[merchant.category]} isn't allowed on your agent card.`,
      `${CATEGORY_LABELS[merchant.category]} is allowed.`,
    );
    hard(
      "per_payment",
      "Per-payment limit",
      amountCents <= card.perPaymentLimitCents,
      `Above the ${usd(card.perPaymentLimitCents)} per-payment limit.`,
      `Within the ${usd(card.perPaymentLimitCents)} per-payment limit.`,
    );
    hard(
      "daily",
      "Daily limit",
      ctx.spentTodayCents + amountCents <= card.dailyLimitCents,
      `Would bring today's agent spending to ${usd(ctx.spentTodayCents + amountCents)} (limit ${usd(card.dailyLimitCents)}).`,
      `${usd(ctx.spentTodayCents + amountCents)} of ${usd(card.dailyLimitCents)} today.`,
    );
    hard(
      "monthly",
      "Monthly limit",
      ctx.spentMonthCents + amountCents <= card.monthlyLimitCents,
      `Would bring this month's agent spending to ${usd(ctx.spentMonthCents + amountCents)} (limit ${usd(card.monthlyLimitCents)}).`,
      `${usd(ctx.spentMonthCents + amountCents)} of ${usd(card.monthlyLimitCents)} this month.`,
    );
  }
  hard(
    "wallet",
    "Agent wallet",
    amountCents <= ctx.walletCents,
    `The agent wallet has ${usd(ctx.walletCents)}. Top it up to pay ${usd(amountCents)}.`,
    `${usd(ctx.walletCents)} available in the agent wallet.`,
  );

  if (card) {
    soft(
      "approval_threshold",
      "Approval threshold",
      amountCents <= card.approvalThresholdCents,
      `Above your ${usd(card.approvalThresholdCents)} auto-pay threshold.`,
      `Under the ${usd(card.approvalThresholdCents)} auto-pay threshold.`,
    );
  }
  soft(
    "awake",
    "Agent awake",
    !ctx.agentsPaused,
    "Your agents are paused, so you decide.",
    "Agents are active.",
  );
  soft(
    "velocity",
    "Velocity",
    ctx.paymentsLastHour < VELOCITY_LIMIT_PER_HOUR,
    `${ctx.paymentsLastHour} agent payments in the last hour. Unusual pace.`,
    "Normal payment pace.",
  );
  soft(
    "new_merchant",
    "New merchant",
    !ctx.firstTimeMerchant || amountCents <= NEW_MERCHANT_REVIEW_CENTS,
    `First payment to ${merchant.name} over ${usd(NEW_MERCHANT_REVIEW_CENTS)}.`,
    ctx.firstTimeMerchant ? "New merchant, small amount." : "Known merchant.",
  );

  const decision: PaymentDecision = checks.some((c) => c.status === "block")
    ? "decline"
    : checks.some((c) => c.status === "warn")
      ? "needs_approval"
      : "approve";
  return { decision, checks };
}

/** Terminal codes: short, unambiguous (no 0/O/1/I), e.g. "LQ-7K2X". */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function makeRequestCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 4; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return `LQ-${code}`;
}

export function normalizeRequestCode(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const body = cleaned.startsWith("LQ") ? cleaned.slice(2) : cleaned;
  if (body.length !== 4 || [...body].some((ch) => !CODE_ALPHABET.includes(ch))) return null;
  return `LQ-${body}`;
}
