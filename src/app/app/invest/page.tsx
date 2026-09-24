import Link from "next/link";
import { getDb, simDate } from "@/lib/db";
import { PRODUCTS, SLEEVE_LABELS } from "@/lib/domain/catalog";
import { formatPrice, formatUsd } from "@/lib/domain/money";
import type { InvestableSleeve } from "@/lib/domain/types";
import { describeLiquidity } from "@/lib/agents/tools";
import { getDealReview } from "@/lib/services/deals";
import { getSnapshot } from "@/lib/services/portfolio";
import { latestPrices } from "@/lib/services/repo";
import { Badge, SLEEVE_COLORS } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invest" };

const SECTIONS: { sleeve: InvestableSleeve; blurb: string }[] = [
  { sleeve: "index", blurb: "Low-cost index funds. Daily liquidity, market prices." },
  { sleeve: "trading", blurb: "Systematic strategies run by Quant. Daily liquidity." },
  {
    sleeve: "bitcoin",
    blurb: "Trades 24/7, settles instantly. Position size is capped by your profile.",
  },
  {
    sleeve: "business",
    blurb:
      "Revenue share and minority stakes in real businesses. Gated or locked; we say so up front.",
  },
  {
    sleeve: "private",
    blurb:
      "Private credit and equity. 4–7 year lock-ups, independent monthly valuations, and a 5% cap per originator.",
  },
];

export default function InvestPage() {
  const db = getDb();
  const prices = latestPrices(db, simDate(db));
  const held = new Map(getSnapshot(db).holdings.map((h) => [h.product.id, h.valueCents]));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-4xl text-fg">Invest</h1>
        <p className="mt-1 max-w-2xl text-sm text-fg-2">
          Every product shows its real liquidity terms and who values it. Private deals only appear
          after Scout&apos;s diligence, and rejected deals can&apos;t be bought.
        </p>
      </div>
      {SECTIONS.map(({ sleeve, blurb }) => (
        <section key={sleeve}>
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: SLEEVE_COLORS[sleeve] }}
              aria-hidden
            />
            <h2 className="text-lg font-semibold text-fg">{SLEEVE_LABELS[sleeve]}</h2>
          </div>
          <p className="mb-4 text-sm text-muted">{blurb}</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {PRODUCTS.filter((p) => p.sleeve === sleeve).map((p) => {
              const review = p.kind === "deal" ? getDealReview(db, p.id) : null;
              const price = prices.get(p.id);
              return (
                <Link
                  key={p.id}
                  href={`/app/invest/${p.id}`}
                  className="group flex flex-col rounded-2xl border border-line bg-surface/80 p-5 transition hover:border-line-strong hover:bg-surface-2/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-[11px] text-muted">{p.id}</div>
                      <h3 className="font-medium text-fg group-hover:text-accent">{p.name}</h3>
                    </div>
                    {review && (
                      <Badge
                        tone={
                          review.verdict === "approve"
                            ? "good"
                            : review.verdict === "watchlist"
                              ? "warning"
                              : "critical"
                        }
                      >
                        Scout:{" "}
                        {review.verdict === "approve"
                          ? "Approved"
                          : review.verdict === "watchlist"
                            ? "Watchlist"
                            : "Rejected"}{" "}
                        · {review.score}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-fg-2">{p.tagline}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <dt className="text-muted">
                      {p.valuation.source === "market" ? "Price" : "NAV / unit"}
                    </dt>
                    <dd className="text-right text-fg tabular">
                      {price ? formatPrice(price.price) : "–"}
                    </dd>
                    <dt className="text-muted">Liquidity</dt>
                    <dd className="text-right text-fg">{describeLiquidity(p)}</dd>
                    <dt className="text-muted">Valuation</dt>
                    <dd className="text-right text-fg">
                      {p.valuation.source === "market"
                        ? "Market"
                        : p.valuation.source === "independent"
                          ? "Independent appraiser"
                          : "⚠ Originator-marked"}
                    </dd>
                    <dt className="text-muted">Minimum</dt>
                    <dd className="text-right text-fg tabular">{formatUsd(p.minTicketCents)}</dd>
                  </dl>
                  {held.has(p.id) && (
                    <div className="mt-4 border-t border-line pt-3 text-xs text-fg-2">
                      You hold {formatUsd(held.get(p.id)!)}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
