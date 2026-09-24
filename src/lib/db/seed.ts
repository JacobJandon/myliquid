import type Database from "better-sqlite3";
import { DEALS, PRODUCTS } from "@/lib/domain/catalog";
import { addDays } from "@/lib/domain/dates";
import { scoreDeal } from "@/lib/domain/diligence";
import { generateHistory } from "@/lib/domain/market";
import { createInvestor } from "@/lib/services/investors";
import { nowIso } from "./util";

/**
 * Seeds the shared market (a year of price history and Scout's initial deal
 * screening) and the demo investor.
 */
export function seedDatabase(db: Database.Database, today: string): void {
  const historyStart = addDays(today, -365);

  db.transaction(() => {
    const insertPrice = db.prepare(
      "INSERT INTO prices (product_id, date, price, source) VALUES (?, ?, ?, ?)",
    );
    for (const product of PRODUCTS) {
      for (const p of generateHistory(product, historyStart, today))
        insertPrice.run(product.id, p.date, p.price, p.source);
    }

    // Initial deal screening, so nothing unreviewed is ever on the shelf.
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

    const setMeta = db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)");
    setMeta.run("sim_date", today);
    setMeta.run("history_start", historyStart);

    createInvestor(db, {
      id: "inv_demo",
      kind: "demo",
      name: "Alex Morgan",
      riskProfile: "balanced",
      starter: "sample",
    });

    setMeta.run("seeded_at", nowIso());
  })();
}
