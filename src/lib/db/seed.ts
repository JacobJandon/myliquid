import type Database from "better-sqlite3";
import { DEALS, PRODUCTS, requireProduct } from "@/lib/domain/catalog";
import { addDays, addMonths } from "@/lib/domain/dates";
import { scoreDeal } from "@/lib/domain/diligence";
import { generateHistory } from "@/lib/domain/market";
import type { PricePoint } from "@/lib/domain/types";
import { newId, nowIso } from "./util";

const DEMO_INVESTOR_ID = "inv_demo";

/** The demo investor funded their account a year before the simulation starts. */
const INITIAL_DEPOSIT_CENTS = 250_000_00;

const INITIAL_ALLOCATION: { productId: string; amountCents: number }[] = [
  { productId: "MLWX", amountCents: 70_000_00 },
  { productId: "MLUS", amountCents: 30_000_00 },
  { productId: "MLBD", amountCents: 15_000_00 },
  { productId: "MLQM", amountCents: 25_000_00 },
  { productId: "BTC", amountCents: 16_000_00 },
  { productId: "MLMS", amountCents: 20_000_00 },
  { productId: "MLPC", amountCents: 30_000_00 },
  { productId: "DL-HARBOR", amountCents: 10_000_00 },
];

export function seedDatabase(db: Database.Database, today: string): void {
  const historyStart = addDays(today, -365);
  const createdAt = nowIso();

  const seed = db.transaction(() => {
    // Prices
    const insertPrice = db.prepare(
      "INSERT INTO prices (product_id, date, price, source) VALUES (?, ?, ?, ?)",
    );
    const histories = new Map<string, PricePoint[]>();
    for (const product of PRODUCTS) {
      const history = generateHistory(product, historyStart, today);
      histories.set(product.id, history);
      for (const p of history) insertPrice.run(product.id, p.date, p.price, p.source);
    }

    // Investor, mandate, account
    db.prepare(
      "INSERT INTO investors (id, name, email, risk_profile, kyc_status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(DEMO_INVESTOR_ID, "Alex Morgan", "demo@myliquid.app", "balanced", "verified", createdAt);

    db.prepare(
      `INSERT INTO mandates (investor_id, autonomy, auto_execute_limit_cents, agent_budget_cents, per_order_cap_cents,
        daily_cap_cents, max_orders_per_day, allowed_sleeves, read_only, kill_switch, kill_reason, circuit_breaker_pct, disabled_agents)
       VALUES (?, 'propose', ?, ?, ?, ?, ?, ?, 0, 0, NULL, ?, '[]')`,
    ).run(
      DEMO_INVESTOR_ID,
      2_500_00,
      25_000_00,
      10_000_00,
      25_000_00,
      10,
      JSON.stringify(["index", "trading", "bitcoin"]),
      0.05,
    );

    const invested = INITIAL_ALLOCATION.reduce((s, a) => s + a.amountCents, 0);
    const cashCents = INITIAL_DEPOSIT_CENTS - invested;
    db.prepare("INSERT INTO accounts (investor_id, cash_cents) VALUES (?, ?)").run(
      DEMO_INVESTOR_ID,
      cashCents,
    );

    db.prepare(
      "INSERT INTO cash_movements (id, investor_id, kind, amount_cents, status, created_on, settle_on, created_at) VALUES (?, ?, 'deposit', ?, 'settled', ?, ?, ?)",
    ).run(
      newId("cash"),
      DEMO_INVESTOR_ID,
      INITIAL_DEPOSIT_CENTS,
      historyStart,
      historyStart,
      createdAt,
    );

    // Initial lots, bought on the first day of history
    const insertLot = db.prepare(
      "INSERT INTO lots (id, investor_id, product_id, units, cost_cents, acquired_on, locked_until) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    const insertOrder = db.prepare(
      `INSERT INTO orders (id, investor_id, product_id, side, amount_cents, filled_cents, units, price, status, placed_by,
        created_on, settle_on, note, checks, created_at)
       VALUES (?, ?, ?, 'buy', ?, ?, ?, ?, 'settled', 'user', ?, ?, ?, '[]', ?)`,
    );
    const unitsByProduct = new Map<string, number>();
    for (const { productId, amountCents } of INITIAL_ALLOCATION) {
      const product = requireProduct(productId);
      const price = histories.get(productId)![0]!.price;
      const units = amountCents / 100 / price;
      unitsByProduct.set(productId, units);
      const lockedUntil =
        product.liquidity.lockupMonths > 0
          ? addMonths(historyStart, product.liquidity.lockupMonths)
          : null;
      insertLot.run(
        newId("lot"),
        DEMO_INVESTOR_ID,
        productId,
        units,
        amountCents,
        historyStart,
        lockedUntil,
      );
      insertOrder.run(
        newId("ord"),
        DEMO_INVESTOR_ID,
        productId,
        amountCents,
        amountCents,
        units,
        price,
        historyStart,
        historyStart,
        productId === "BTC" ? "Transferred in from an external exchange" : "Initial allocation",
        createdAt,
      );
    }

    // NAV history: replay prices over the year
    const insertNav = db.prepare(
      "INSERT INTO nav_history (investor_id, date, total_cents) VALUES (?, ?, ?)",
    );
    const cursor = new Map<string, { index: number; price: number }>();
    for (const [productId, history] of histories)
      cursor.set(productId, { index: 0, price: history[0]!.price });
    for (let date = historyStart; date <= today; date = addDays(date, 1)) {
      let total = cashCents;
      for (const [productId, units] of unitsByProduct) {
        const history = histories.get(productId)!;
        const c = cursor.get(productId)!;
        while (c.index + 1 < history.length && history[c.index + 1]!.date <= date) {
          c.index += 1;
          c.price = history[c.index]!.price;
        }
        total += Math.round(units * c.price * 100);
      }
      insertNav.run(DEMO_INVESTOR_ID, date, total);
    }

    // Initial deal screening so nothing unreviewed is ever on the shelf
    const insertReview = db.prepare(
      "INSERT INTO deal_reviews (product_id, score, verdict, flags, memo, reviewed_on, reviewed_by) VALUES (?, ?, ?, ?, ?, ?, 'scout')",
    );
    for (const deal of DEALS) {
      const result = scoreDeal(deal);
      insertReview.run(
        deal.productId,
        result.score,
        result.verdict,
        JSON.stringify(result.flags),
        result.memo,
        today,
      );
    }

    db.prepare(
      "INSERT INTO agent_events (run_id, agent, kind, title, payload, sim_date, created_at) VALUES (NULL, 'sentinel', 'system', ?, NULL, ?, ?)",
    ).run(
      "Platform initialized. Guardrails are active and every agent starts in propose-only mode.",
      today,
      createdAt,
    );

    const setMeta = db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)");
    setMeta.run("sim_date", today);
    setMeta.run("history_start", historyStart);
    setMeta.run("seeded_at", createdAt);
  });

  seed();
}
