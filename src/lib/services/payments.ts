import { randomBytes } from "node:crypto";
import { newId, nowIso, type Db } from "@/lib/db";
import { requireProduct } from "@/lib/domain/catalog";
import { formatUsd } from "@/lib/domain/money";
import {
  DEFAULT_CARD_POLICY,
  evaluatePayment,
  getMerchant,
  makeRequestCode,
  normalizeRequestCode,
  requireMerchant,
  type CardPolicy,
  type MerchantCategory,
  type PaymentDecision,
} from "@/lib/domain/payments";
import type { Actor, CheckResult } from "@/lib/domain/types";
import { logEvent } from "./audit";
import { awardXp, petName, spendEnergy } from "./companion";
import { adjustCash, getCash, getMandate } from "./repo";

/**
 * Agent Pay: a funded agent wallet, a tokenized agent card with a spending
 * policy, merchant terminals that create payment requests, tap-to-pay, owner
 * approvals, and x402-style pay-per-call data purchases.
 */

// ── Wallet ──────────────────────────────────────────────────────────────────

export function ensureAgentPay(db: Db, investorId: string): void {
  db.prepare("INSERT OR IGNORE INTO wallets (investor_id, balance_cents) VALUES (?, 0)").run(
    investorId,
  );
  const card = db.prepare("SELECT id FROM agent_cards WHERE investor_id = ?").get(investorId);
  if (!card) {
    const p = DEFAULT_CARD_POLICY;
    db.prepare(
      `INSERT INTO agent_cards (id, investor_id, last4, token, status, per_payment_limit_cents, approval_threshold_cents,
        daily_limit_cents, monthly_limit_cents, allowed_categories, created_at) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
    ).run(
      newId("card"),
      investorId,
      String(1000 + (randomBytes(2).readUInt16BE(0) % 9000)),
      `agt_${randomBytes(12).toString("hex")}`,
      p.perPaymentLimitCents,
      p.approvalThresholdCents,
      p.dailyLimitCents,
      p.monthlyLimitCents,
      JSON.stringify(p.allowedCategories),
      nowIso(),
    );
  }
}

export function getWalletBalance(db: Db, investorId: string): number {
  ensureAgentPay(db, investorId);
  return (
    db.prepare("SELECT balance_cents FROM wallets WHERE investor_id = ?").get(investorId) as {
      balance_cents: number;
    }
  ).balance_cents;
}

function ledger(
  db: Db,
  investorId: string,
  kind: string,
  amountCents: number,
  ref: string | null,
): void {
  db.prepare(
    "INSERT INTO wallet_ledger (id, investor_id, kind, amount_cents, ref, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(newId("wl"), investorId, kind, amountCents, ref, nowIso());
}

export const MAX_WALLET_CENTS = 5_000_00;

/** Moves cash into the agent wallet. Only a human can do this: the wallet is the agent's hard spending ceiling. */
export function fundWallet(db: Db, investorId: string, amountCents: number): number {
  if (!Number.isInteger(amountCents) || amountCents <= 0)
    throw new Error("Amount must be positive");
  const cash = getCash(db, investorId);
  if (amountCents > cash) throw new Error(`Only ${formatUsd(cash)} of cash is available`);
  const balance = getWalletBalance(db, investorId);
  if (balance + amountCents > MAX_WALLET_CENTS)
    throw new Error(`The agent wallet holds at most ${formatUsd(MAX_WALLET_CENTS)}`);
  db.transaction(() => {
    adjustCash(db, investorId, -amountCents);
    db.prepare("UPDATE wallets SET balance_cents = balance_cents + ? WHERE investor_id = ?").run(
      amountCents,
      investorId,
    );
    ledger(db, investorId, "fund", amountCents, null);
    logEvent(db, investorId, {
      agent: "user",
      kind: "system",
      title: `Moved ${formatUsd(amountCents)} into the agent wallet`,
    });
  })();
  return getWalletBalance(db, investorId);
}

export function defundWallet(db: Db, investorId: string, amountCents: number): number {
  if (!Number.isInteger(amountCents) || amountCents <= 0)
    throw new Error("Amount must be positive");
  const balance = getWalletBalance(db, investorId);
  if (amountCents > balance) throw new Error(`The agent wallet only has ${formatUsd(balance)}`);
  db.transaction(() => {
    db.prepare("UPDATE wallets SET balance_cents = balance_cents - ? WHERE investor_id = ?").run(
      amountCents,
      investorId,
    );
    adjustCash(db, investorId, amountCents);
    ledger(db, investorId, "defund", -amountCents, null);
    logEvent(db, investorId, {
      agent: "user",
      kind: "system",
      title: `Moved ${formatUsd(amountCents)} from the agent wallet back to cash`,
    });
  })();
  return getWalletBalance(db, investorId);
}

// ── Card ────────────────────────────────────────────────────────────────────

export interface AgentCard extends CardPolicy {
  id: string;
  last4: string;
  createdAt: string;
}

export function getCard(db: Db, investorId: string): AgentCard {
  ensureAgentPay(db, investorId);
  const r = db.prepare("SELECT * FROM agent_cards WHERE investor_id = ?").get(investorId) as Record<
    string,
    unknown
  >;
  return {
    id: r.id as string,
    last4: r.last4 as string,
    status: r.status as CardPolicy["status"],
    perPaymentLimitCents: r.per_payment_limit_cents as number,
    approvalThresholdCents: r.approval_threshold_cents as number,
    dailyLimitCents: r.daily_limit_cents as number,
    monthlyLimitCents: r.monthly_limit_cents as number,
    allowedCategories: JSON.parse(r.allowed_categories as string) as MerchantCategory[],
    createdAt: r.created_at as string,
  };
}

/** Human-only: the spending policy. */
export function updateCard(db: Db, investorId: string, patch: Partial<CardPolicy>): AgentCard {
  const c = { ...getCard(db, investorId), ...patch };
  if (c.approvalThresholdCents > c.perPaymentLimitCents)
    c.approvalThresholdCents = c.perPaymentLimitCents;
  db.prepare(
    `UPDATE agent_cards SET status = ?, per_payment_limit_cents = ?, approval_threshold_cents = ?, daily_limit_cents = ?,
      monthly_limit_cents = ?, allowed_categories = ? WHERE investor_id = ?`,
  ).run(
    c.status,
    c.perPaymentLimitCents,
    c.approvalThresholdCents,
    c.dailyLimitCents,
    c.monthlyLimitCents,
    JSON.stringify(c.allowedCategories.filter((cat, i, all) => all.indexOf(cat) === i)),
    investorId,
  );
  logEvent(db, investorId, {
    agent: "user",
    kind: "system",
    title: patch.status
      ? `Agent card ${patch.status === "frozen" ? "frozen" : "unfrozen"}`
      : "Agent card limits updated",
  });
  return getCard(db, investorId);
}

// ── Merchant terminals ──────────────────────────────────────────────────────

export interface PaymentRequest {
  id: string;
  code: string;
  merchantId: string;
  merchantName: string;
  merchantIcon: string;
  category: MerchantCategory;
  amountCents: number;
  description: string;
  status: "open" | "paid" | "declined" | "pending_approval" | "expired";
  paidBy: string | null;
  reason: string | null;
  createdAt: string;
  expiresAt: string;
}

const REQUEST_TTL_MS = 15 * 60_000;

function mapRequest(db: Db, r: Record<string, unknown>): PaymentRequest {
  const merchant = requireMerchant(r.merchant_id as string);
  let status = r.status as PaymentRequest["status"];
  if (status === "open" && new Date(r.expires_at as string).getTime() < Date.now())
    status = "expired";
  let paidBy: string | null = null;
  let reason: string | null = null;
  if (r.investor_id) {
    const inv = db.prepare("SELECT name FROM investors WHERE id = ?").get(r.investor_id) as
      { name: string } | undefined;
    // Terminals only see the pet's name and the owner's first name.
    paidBy = `${petName(db, r.investor_id as string)}, agent of ${(inv?.name ?? "a customer").split(" ")[0]}`;
  }
  if (r.payment_id) {
    const p = db.prepare("SELECT reason FROM payments WHERE id = ?").get(r.payment_id) as
      { reason: string | null } | undefined;
    reason = p?.reason ?? null;
  }
  return {
    id: r.id as string,
    code: r.code as string,
    merchantId: merchant.id,
    merchantName: merchant.name,
    merchantIcon: merchant.icon,
    category: merchant.category,
    amountCents: r.amount_cents as number,
    description: r.description as string,
    status,
    paidBy,
    reason,
    createdAt: r.created_at as string,
    expiresAt: r.expires_at as string,
  };
}

export function createPaymentRequest(
  db: Db,
  input: { merchantId: string; amountCents: number; description?: string },
): PaymentRequest {
  const merchant = requireMerchant(input.merchantId);
  if (
    !Number.isInteger(input.amountCents) ||
    input.amountCents <= 0 ||
    input.amountCents > 10_000_00
  ) {
    throw new Error("Amount must be between $0.01 and $10,000");
  }
  let code = makeRequestCode();
  for (
    let i = 0;
    i < 10 && db.prepare("SELECT 1 FROM payment_requests WHERE code = ?").get(code);
    i++
  )
    code = makeRequestCode();
  const id = newId("preq");
  const now = new Date();
  db.prepare(
    `INSERT INTO payment_requests (id, code, merchant_id, amount_cents, description, status, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`,
  ).run(
    id,
    code,
    merchant.id,
    input.amountCents,
    (input.description ?? "").trim().slice(0, 80) || `${merchant.name} purchase`,
    now.toISOString(),
    new Date(now.getTime() + REQUEST_TTL_MS).toISOString(),
  );
  return getPaymentRequest(db, code)!;
}

export function getPaymentRequest(db: Db, code: string): PaymentRequest | null {
  const normalized = normalizeRequestCode(code);
  if (!normalized) return null;
  const row = db.prepare("SELECT * FROM payment_requests WHERE code = ?").get(normalized) as
    Record<string, unknown> | undefined;
  return row ? mapRequest(db, row) : null;
}

/** "Nearby" terminals: open requests from the last 15 minutes (a stand-in for NFC proximity). */
export function listOpenRequests(db: Db, limit = 8): PaymentRequest[] {
  const rows = db
    .prepare(
      "SELECT * FROM payment_requests WHERE status = 'open' AND expires_at > ? ORDER BY created_at DESC LIMIT ?",
    )
    .all(nowIso(), limit) as Record<string, unknown>[];
  return rows.map((r) => mapRequest(db, r));
}

// ── Payments ────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  merchantId: string;
  merchantName: string;
  merchantIcon: string;
  category: MerchantCategory;
  amountCents: number;
  channel: "pos" | "online" | "x402";
  status: "approved" | "declined" | "pending_approval";
  initiatedBy: string;
  requestCode: string | null;
  description: string;
  checks: CheckResult[];
  reason: string | null;
  createdAt: string;
  decidedAt: string | null;
}

function mapPayment(db: Db, r: Record<string, unknown>): Payment {
  const merchant = getMerchant(r.merchant_id as string);
  const req = r.request_id
    ? (db.prepare("SELECT code FROM payment_requests WHERE id = ?").get(r.request_id) as
        { code: string } | undefined)
    : undefined;
  return {
    id: r.id as string,
    merchantId: r.merchant_id as string,
    merchantName: merchant?.name ?? (r.merchant_id as string),
    merchantIcon: merchant?.icon ?? "🏷️",
    category: merchant?.category ?? "retail",
    amountCents: r.amount_cents as number,
    channel: r.channel as Payment["channel"],
    status: r.status as Payment["status"],
    initiatedBy: r.initiated_by as string,
    requestCode: req?.code ?? null,
    description: r.description as string,
    checks: JSON.parse(r.checks as string) as CheckResult[],
    reason: (r.reason as string | null) ?? null,
    createdAt: r.created_at as string,
    decidedAt: (r.decided_at as string | null) ?? null,
  };
}

export function listPayments(
  db: Db,
  investorId: string,
  opts: { status?: Payment["status"]; limit?: number } = {},
): Payment[] {
  const rows = db
    .prepare(
      `SELECT * FROM payments WHERE investor_id = ? ${opts.status ? "AND status = ?" : ""} ORDER BY created_at DESC LIMIT ?`,
    )
    .all(...[investorId, ...(opts.status ? [opts.status] : []), opts.limit ?? 50]) as Record<
    string,
    unknown
  >[];
  return rows.map((r) => mapPayment(db, r));
}

export function getPayment(db: Db, investorId: string, id: string): Payment | null {
  const row = db
    .prepare("SELECT * FROM payments WHERE id = ? AND investor_id = ?")
    .get(id, investorId) as Record<string, unknown> | undefined;
  return row ? mapPayment(db, row) : null;
}

export interface SpendSummary {
  todayCents: number;
  monthCents: number;
  lastHourCount: number;
}

export function spendSummary(db: Db, investorId: string, now = new Date()): SpendSummary {
  const day = now.toISOString().slice(0, 10);
  const month = now.toISOString().slice(0, 7);
  const sum = (prefix: string) =>
    (
      db
        .prepare(
          "SELECT COALESCE(SUM(amount_cents), 0) AS s FROM payments WHERE investor_id = ? AND status = 'approved' AND created_at LIKE ?",
        )
        .get(investorId, `${prefix}%`) as { s: number }
    ).s;
  const lastHourCount = (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM payments WHERE investor_id = ? AND status IN ('approved', 'pending_approval') AND created_at > ?",
      )
      .get(investorId, new Date(now.getTime() - 3_600_000).toISOString()) as { n: number }
  ).n;
  return { todayCents: sum(day), monthCents: sum(month), lastHourCount };
}

function paymentContext(db: Db, investorId: string, merchantId: string, amountCents: number) {
  const card = getCard(db, investorId);
  const spend = spendSummary(db, investorId);
  const known = db
    .prepare(
      "SELECT 1 FROM payments WHERE investor_id = ? AND merchant_id = ? AND status = 'approved' LIMIT 1",
    )
    .get(investorId, merchantId);
  return {
    card,
    walletCents: getWalletBalance(db, investorId),
    spentTodayCents: spend.todayCents,
    spentMonthCents: spend.monthCents,
    paymentsLastHour: spend.lastHourCount,
    agentsPaused: getMandate(db, investorId).killSwitch,
    merchant: requireMerchant(merchantId),
    amountCents,
    firstTimeMerchant: !known,
  };
}

export interface PayResult {
  decision: PaymentDecision;
  payment: Payment;
  message: string;
}

function settle(
  db: Db,
  investorId: string,
  paymentId: string,
  amountCents: number,
  merchantName: string,
): void {
  db.prepare("UPDATE wallets SET balance_cents = balance_cents - ? WHERE investor_id = ?").run(
    amountCents,
    investorId,
  );
  ledger(db, investorId, "payment", -amountCents, paymentId);
  spendEnergy(db, investorId, 2);
  awardXp(db, investorId, "agent_payment", { note: merchantName });
}

function decisionMessage(
  db: Db,
  investorId: string,
  decision: PaymentDecision,
  merchantName: string,
  amountCents: number,
  checks: CheckResult[],
): string {
  const pet = petName(db, investorId);
  if (decision === "approve")
    return `${pet} paid ${merchantName} ${formatUsd(amountCents)} from the agent wallet.`;
  if (decision === "needs_approval") {
    return `${pet} wants your OK to pay ${merchantName} ${formatUsd(amountCents)}: ${checks
      .filter((c) => c.status === "warn")
      .map((c) => c.detail)
      .join(" ")}`;
  }
  return `${pet} declined: ${checks
    .filter((c) => c.status === "block")
    .map((c) => c.detail)
    .join(" ")}`;
}

/** Records a payment attempt against the policy and settles it if approved. */
function attemptPayment(
  db: Db,
  investorId: string,
  input: {
    merchantId: string;
    amountCents: number;
    channel: Payment["channel"];
    initiatedBy: Actor;
    description: string;
    requestId?: string | null;
  },
): PayResult {
  const merchant = requireMerchant(input.merchantId);
  const { decision, checks } = evaluatePayment(
    paymentContext(db, investorId, merchant.id, input.amountCents),
  );
  const id = newId("pay");
  const status =
    decision === "approve" ? "approved" : decision === "decline" ? "declined" : "pending_approval";
  const message = decisionMessage(
    db,
    investorId,
    decision,
    merchant.name,
    input.amountCents,
    checks,
  );
  db.transaction(() => {
    db.prepare(
      `INSERT INTO payments (id, investor_id, card_id, merchant_id, amount_cents, channel, status, initiated_by, request_id, description, checks, reason, created_at, decided_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      investorId,
      getCard(db, investorId).id,
      merchant.id,
      input.amountCents,
      input.channel,
      status,
      input.initiatedBy,
      input.requestId ?? null,
      input.description,
      JSON.stringify(checks),
      decision === "approve" ? null : message,
      nowIso(),
      decision === "needs_approval" ? null : nowIso(),
    );
    if (decision === "approve") settle(db, investorId, id, input.amountCents, merchant.name);
    logEvent(db, investorId, {
      agent: input.initiatedBy,
      kind: "order",
      title: `${input.channel === "x402" ? "x402 payment" : "Payment"} ${status.replace("_", " ")}: ${formatUsd(input.amountCents)} at ${merchant.name}`,
      payload: { paymentId: id, decision },
    });
  })();
  return { decision, payment: getPayment(db, investorId, id)!, message };
}

/** The agent taps to pay a terminal's payment request. */
export function payRequest(
  db: Db,
  investorId: string,
  code: string,
  initiatedBy: Actor,
): PayResult {
  const req = getPaymentRequest(db, code);
  if (!req) throw new Error("No payment request with that code");
  if (req.status === "expired") throw new Error("That payment request has expired");
  if (req.status !== "open")
    throw new Error(`That payment request is already ${req.status.replace("_", " ")}`);
  const result = attemptPayment(db, investorId, {
    merchantId: req.merchantId,
    amountCents: req.amountCents,
    channel: "pos",
    initiatedBy,
    description: req.description,
    requestId: req.id,
  });
  const reqStatus =
    result.decision === "approve"
      ? "paid"
      : result.decision === "decline"
        ? "declined"
        : "pending_approval";
  db.prepare(
    "UPDATE payment_requests SET status = ?, investor_id = ?, payment_id = ? WHERE id = ?",
  ).run(reqStatus, investorId, result.payment.id, req.id);
  return result;
}

/** The owner approves or declines a payment the agent held for review. */
export function decidePayment(
  db: Db,
  investorId: string,
  paymentId: string,
  approve: boolean,
): PayResult {
  const payment = getPayment(db, investorId, paymentId);
  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "pending_approval")
    throw new Error(`Payment is already ${payment.status}`);
  let decision: PaymentDecision = "decline";
  let checks = payment.checks;
  let message: string;
  if (approve) {
    const evaluated = evaluatePayment(
      paymentContext(db, investorId, payment.merchantId, payment.amountCents),
      { ownerApproved: true },
    );
    decision = evaluated.decision;
    checks = evaluated.checks;
    message = decisionMessage(
      db,
      investorId,
      decision,
      payment.merchantName,
      payment.amountCents,
      checks,
    );
  } else {
    message = `You declined the ${formatUsd(payment.amountCents)} payment to ${payment.merchantName}.`;
  }
  const status = decision === "approve" ? "approved" : "declined";
  db.transaction(() => {
    db.prepare(
      "UPDATE payments SET status = ?, checks = ?, reason = ?, decided_at = ? WHERE id = ?",
    ).run(
      status,
      JSON.stringify(checks),
      status === "approved" ? null : message,
      nowIso(),
      paymentId,
    );
    if (status === "approved")
      settle(db, investorId, paymentId, payment.amountCents, payment.merchantName);
    db.prepare("UPDATE payment_requests SET status = ? WHERE payment_id = ?").run(
      status === "approved" ? "paid" : "declined",
      paymentId,
    );
    logEvent(db, investorId, {
      agent: "user",
      kind: "order",
      title: `${approve ? "Approved" : "Declined"} agent payment: ${formatUsd(payment.amountCents)} at ${payment.merchantName}${approve && status !== "approved" ? " (still blocked by policy)" : ""}`,
    });
  })();
  return { decision, payment: getPayment(db, investorId, paymentId)!, message };
}

// ── x402: pay-per-call premium data ─────────────────────────────────────────

export const X402_PRICE_CENTS = 50;
export const X402_MERCHANT = "m_northbridge";

/** Payment requirements returned with HTTP 402 for a premium resource. */
export function x402Requirements(resource: string) {
  return {
    x402Version: 1,
    error: "Payment required",
    accepts: [
      {
        scheme: "myliquid-wallet",
        network: "myliquid",
        maxAmountRequired: (X402_PRICE_CENTS / 100).toFixed(2),
        asset: "USD",
        payTo: requireMerchant(X402_MERCHANT).name,
        resource,
        description: "Premium diligence report (court filings, credit events, auditor notes)",
        mimeType: "application/json",
      },
    ],
  };
}

/** Deterministic "premium" diligence data for a private deal. */
export function premiumReport(productId: string): Record<string, unknown> {
  const product = requireProduct(productId);
  const reports: Record<string, string[]> = {
    "DL-NORDHAVN": [
      "Three winding-up petitions filed against Nordhavn subsidiaries in 2026.",
      "The group's auditor resigned in Q2; no replacement appointed.",
      "Two earlier bond series were extended at maturity instead of repaid.",
    ],
    "DL-HARBOR": [
      "No litigation on record.",
      "Debt service coverage 1.8x on audited FY2025 figures.",
      "Collateral appraisal refreshed in Q2 2026.",
    ],
    "DL-SOLAR": [
      "Offtaker ratings unchanged (investment grade).",
      "Portfolio availability 99.1% over the last 12 months.",
    ],
    "DL-VERDANT": [
      "Lead sponsor has 14 prior healthcare deals; no write-offs.",
      "Same-clinic revenue +11% year over year.",
    ],
    "DL-BAKE": [
      "CPA-reviewed statements only; audit scheduled for FY2026.",
      "Two late supplier payments in 2025, since cured.",
    ],
    "DL-CEDAR": [
      "Family governance agreement includes minority protections.",
      "No liens beyond the equipment facility.",
    ],
  };
  return {
    product: product.name,
    source: "Northbridge Data (simulated premium source)",
    findings: reports[productId] ?? ["No premium data for this product."],
  };
}

export interface X402Result extends PayResult {
  data: Record<string, unknown> | null;
}

/** An agent buys a premium report for one call: 402 → pay from the wallet → data. */
export function x402Purchase(
  db: Db,
  investorId: string,
  productId: string,
  initiatedBy: Actor,
): X402Result {
  requireProduct(productId);
  const result = attemptPayment(db, investorId, {
    merchantId: X402_MERCHANT,
    amountCents: X402_PRICE_CENTS,
    channel: "x402",
    initiatedBy,
    description: `Premium report: ${productId}`,
  });
  return { ...result, data: result.decision === "approve" ? premiumReport(productId) : null };
}
