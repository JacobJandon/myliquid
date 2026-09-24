import type { Db } from "@/lib/db";
import { DEALS, requireProduct } from "@/lib/domain/catalog";
import type { DiligenceFlag, DiligenceResult } from "@/lib/domain/diligence";
import type { DealVerdict } from "@/lib/domain/risk";
import type { DealFacts, Product } from "@/lib/domain/types";

export interface DealReview {
  productId: string;
  score: number;
  verdict: DealVerdict;
  flags: DiligenceFlag[];
  memo: string;
  reviewedOn: string;
  reviewedBy: string;
}

export function getDealReview(db: Db, productId: string): DealReview | null {
  const row = db.prepare("SELECT * FROM deal_reviews WHERE product_id = ?").get(productId) as
    | {
        product_id: string;
        score: number;
        verdict: DealVerdict;
        flags: string;
        memo: string;
        reviewed_on: string;
        reviewed_by: string;
      }
    | undefined;
  if (!row) return null;
  return {
    productId: row.product_id,
    score: row.score,
    verdict: row.verdict,
    flags: JSON.parse(row.flags) as DiligenceFlag[],
    memo: row.memo,
    reviewedOn: row.reviewed_on,
    reviewedBy: row.reviewed_by,
  };
}

export function saveDealReview(
  db: Db,
  result: DiligenceResult,
  date: string,
  reviewedBy = "scout",
): void {
  db.prepare(
    "INSERT OR REPLACE INTO deal_reviews (product_id, score, verdict, flags, memo, reviewed_on, reviewed_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    result.productId,
    result.score,
    result.verdict,
    JSON.stringify(result.flags),
    result.memo,
    date,
    reviewedBy,
  );
}

export interface DealListing {
  product: Product;
  facts: DealFacts;
  review: DealReview | null;
}

export function listDeals(db: Db): DealListing[] {
  return DEALS.map((facts) => ({
    product: requireProduct(facts.productId),
    facts,
    review: getDealReview(db, facts.productId),
  }));
}

/** Illiquid products Atlas may buy: open funds plus deals Scout approved. */
export function eligibleIlliquidProducts(db: Db): string[] {
  const approvedDeals = listDeals(db)
    .filter((d) => d.review?.verdict === "approve")
    .sort((a, b) => (b.review?.score ?? 0) - (a.review?.score ?? 0))
    .map((d) => d.product.id);
  return ["MLMS", "MLPC", ...approvedDeals];
}
