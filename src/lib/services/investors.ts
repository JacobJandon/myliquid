import type { Db } from "@/lib/db";
import { getMeta } from "@/lib/db";
import { insertMany, newId, nowIso } from "@/lib/db/util";
import { requireProduct } from "@/lib/domain/catalog";
import { addDays, addMonths } from "@/lib/domain/dates";
import type { RiskProfileId } from "@/lib/domain/types";
import type { PetColor } from "@/lib/domain/companion";
import { logEvent } from "./audit";
import { createCompanion } from "./companion";
import { ensureAgentPay } from "./payments";
import { recordDeposit } from "./orders";
import { recordNav } from "./portfolio";
import { currentPrice, insertMandate, type InvestorKind } from "./repo";

/** Creating, upgrading and removing investor accounts. */

export type Starter = "sample" | "cash";

/** A year-old balanced portfolio (with a bitcoin position above its limit, for the agents to find). */
export const SAMPLE_DEPOSIT_CENTS = 250_000_00;
export const SAMPLE_ALLOCATION: { productId: string; amountCents: number }[] = [
  { productId: "MLWX", amountCents: 70_000_00 },
  { productId: "MLUS", amountCents: 30_000_00 },
  { productId: "MLBD", amountCents: 15_000_00 },
  { productId: "MLQM", amountCents: 25_000_00 },
  { productId: "BTC", amountCents: 16_000_00 },
  { productId: "MLMS", amountCents: 20_000_00 },
  { productId: "MLPC", amountCents: 30_000_00 },
  { productId: "DL-HARBOR", amountCents: 10_000_00 },
];
export const CASH_STARTER_CENTS = 100_000_00;

export interface NewInvestor {
  id?: string;
  kind: InvestorKind;
  name: string;
  email?: string | null;
  passwordHash?: string | null;
  riskProfile: RiskProfileId;
  starter: Starter;
  pet?: { name?: string; color?: PetColor };
}

function marketDates(db: Db): { today: string; historyStart: string } {
  const today = getMeta(db, "sim_date");
  if (!today) throw new Error("Market is not seeded");
  return { today, historyStart: getMeta(db, "history_start") ?? today };
}

export function createInvestor(db: Db, input: NewInvestor): string {
  const id = input.id ?? newId("inv");
  db.transaction(() => {
    db.prepare(
      "INSERT INTO investors (id, kind, name, email, password_hash, risk_profile, kyc_status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'verified', ?)",
    ).run(
      id,
      input.kind,
      input.name,
      input.email?.toLowerCase() ?? null,
      input.passwordHash ?? null,
      input.riskProfile,
      nowIso(),
    );
    createCompanion(db, id, input.pet ?? {});
    setupPortfolio(db, id, input.starter);
  })();
  return id;
}

/** Creates the mandate, the cash account and the starting portfolio for an investor. */
function setupPortfolio(db: Db, id: string, starter: Starter): void {
  const { today, historyStart } = marketDates(db);
  insertMandate(db, id);
  db.prepare("INSERT INTO accounts (investor_id, cash_cents) VALUES (?, 0)").run(id);
  ensureAgentPay(db, id);

  if (starter === "cash") {
    recordDeposit(db, id, CASH_STARTER_CENTS, today);
    recordNav(db, id);
    logEvent(db, id, {
      agent: "system",
      kind: "system",
      title: "Account opened with $100,000 of demo cash. Ask Atlas to build your first allocation.",
    });
    return;
  }

  // Sample portfolio: funded a year ago (or at the start of market history) and held since.
  const start = addDays(today, -365) < historyStart ? historyStart : addDays(today, -365);
  recordDeposit(db, id, SAMPLE_DEPOSIT_CENTS, start);
  const insertLot = db.prepare(
    "INSERT INTO lots (id, investor_id, product_id, units, cost_cents, acquired_on, locked_until) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const insertOrder = db.prepare(
    `INSERT INTO orders (id, investor_id, product_id, side, amount_cents, filled_cents, units, price, status, placed_by,
      created_on, settle_on, note, checks, created_at)
     VALUES (?, ?, ?, 'buy', ?, ?, ?, ?, 'settled', 'user', ?, ?, ?, '[]', ?)`,
  );
  const units = new Map<string, number>();
  for (const { productId, amountCents } of SAMPLE_ALLOCATION) {
    const product = requireProduct(productId);
    const price = currentPrice(db, productId, start) ?? product.startPrice;
    const u = amountCents / 100 / price;
    units.set(productId, u);
    const lockedUntil =
      product.liquidity.lockupMonths > 0 ? addMonths(start, product.liquidity.lockupMonths) : null;
    insertLot.run(newId("lot"), id, productId, u, amountCents, start, lockedUntil);
    insertOrder.run(
      newId("ord"),
      id,
      productId,
      amountCents,
      amountCents,
      u,
      price,
      start,
      start,
      productId === "BTC" ? "Transferred in from an external exchange" : "Initial allocation",
      nowIso(),
    );
  }
  const invested = SAMPLE_ALLOCATION.reduce((s, a) => s + a.amountCents, 0);
  db.prepare("UPDATE accounts SET cash_cents = cash_cents - ? WHERE investor_id = ?").run(
    invested,
    id,
  );
  backfillNav(db, id, units, SAMPLE_DEPOSIT_CENTS - invested, start, today);
  logEvent(db, id, {
    agent: "sentinel",
    kind: "system",
    title:
      "Account opened with a year-old sample portfolio. Guardrails are active and every agent starts in propose-only mode.",
  });
}

/** Wipes an investor's portfolio and activity (keeping their login and API keys) and starts again. */
export function resetPortfolio(db: Db, investorId: string, starter: Starter): void {
  db.transaction(() => {
    db.prepare("UPDATE payment_requests SET investor_id = NULL WHERE investor_id = ?").run(
      investorId,
    );
    for (const table of PORTFOLIO_TABLES)
      db.prepare(`DELETE FROM ${table} WHERE investor_id = ?`).run(investorId);
    setupPortfolio(db, investorId, starter);
  })();
}

/** Replays market prices to rebuild daily NAV for a static set of holdings. */
function backfillNav(
  db: Db,
  investorId: string,
  units: Map<string, number>,
  cashCents: number,
  from: string,
  to: string,
): void {
  const histories = new Map<string, { date: string; price: number }[]>();
  for (const productId of units.keys()) {
    histories.set(
      productId,
      db
        .prepare("SELECT date, price FROM prices WHERE product_id = ? AND date <= ? ORDER BY date")
        .all(productId, to) as {
        date: string;
        price: number;
      }[],
    );
  }
  const cursor = new Map<string, number>();
  const rows: [string, string, number][] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    let total = cashCents;
    for (const [productId, u] of units) {
      const history = histories.get(productId)!;
      let i = cursor.get(productId) ?? 0;
      while (i + 1 < history.length && history[i + 1]!.date <= date) i += 1;
      cursor.set(productId, i);
      total += Math.round(u * (history[i]?.price ?? requireProduct(productId).startPrice) * 100);
    }
    rows.push([investorId, date, total]);
  }
  insertMany(db, "INSERT OR REPLACE INTO nav_history (investor_id, date, total_cents)", rows);
}

export function findInvestorByEmail(
  db: Db,
  email: string,
): { id: string; kind: InvestorKind; passwordHash: string | null } | null {
  const row = db
    .prepare("SELECT id, kind, password_hash FROM investors WHERE email = ?")
    .get(email.trim().toLowerCase()) as
    { id: string; kind: InvestorKind; password_hash: string | null } | undefined;
  return row ? { id: row.id, kind: row.kind, passwordHash: row.password_hash } : null;
}

/** Turns a guest into a registered user, keeping their portfolio. */
export function upgradeGuest(
  db: Db,
  investorId: string,
  input: { name: string; email: string; passwordHash: string; riskProfile?: RiskProfileId },
): void {
  db.prepare(
    "UPDATE investors SET kind = 'user', name = ?, email = ?, password_hash = ?, risk_profile = COALESCE(?, risk_profile) WHERE id = ? AND kind = 'guest'",
  ).run(
    input.name,
    input.email.trim().toLowerCase(),
    input.passwordHash,
    input.riskProfile ?? null,
    investorId,
  );
  logEvent(db, investorId, {
    agent: "user",
    kind: "system",
    title: "Guest account saved as a registered account",
  });
}

const PORTFOLIO_TABLES = [
  "recurring_plans",
  "limit_orders",
  "payments",
  "wallet_ledger",
  "wallets",
  "agent_cards",
  "chat_messages",
  "nav_history",
  "rules",
  "alerts",
  "proposals",
  "cash_movements",
  "orders",
  "lots",
  "accounts",
  "mandates",
  "agent_events",
  "agent_runs",
];
const INVESTOR_TABLES = [
  "sessions",
  "api_key_identities",
  "api_keys",
  "companion_log",
  "companions",
  ...PORTFOLIO_TABLES,
];

export function deleteInvestor(db: Db, investorId: string): void {
  db.transaction(() => {
    db.prepare("UPDATE payment_requests SET investor_id = NULL WHERE investor_id = ?").run(
      investorId,
    );
    for (const table of INVESTOR_TABLES)
      db.prepare(`DELETE FROM ${table} WHERE investor_id = ?`).run(investorId);
    db.prepare("DELETE FROM investors WHERE id = ?").run(investorId);
  })();
}

/** Guest accounts are disposable: remove ones older than `days`. */
export function pruneGuests(db: Db, days = 7): number {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const stale = db
    .prepare("SELECT id FROM investors WHERE kind = 'guest' AND created_at < ?")
    .all(cutoff) as { id: string }[];
  for (const { id } of stale) deleteInvestor(db, id);
  return stale.length;
}
