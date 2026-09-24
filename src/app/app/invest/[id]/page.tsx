import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, simDate } from "@/lib/db";
import { SLEEVE_LABELS, getDealFacts, getProduct } from "@/lib/domain/catalog";
import { addDays, formatDate } from "@/lib/domain/dates";
import { formatPct, formatPrice, formatUsd } from "@/lib/domain/money";
import { unlockedUnits } from "@/lib/domain/risk";
import { reviewValuation } from "@/lib/domain/valuation";
import { describeLiquidity } from "@/lib/agents/tools";
import { getDealReview } from "@/lib/services/deals";
import { getSnapshot } from "@/lib/services/portfolio";
import { getAvailableLots, getLots, priceHistory } from "@/lib/services/repo";
import { TradeTicket } from "@/components/app/TradeTicket";
import { LineChart } from "@/components/charts/LineChart";
import { Markdown } from "@/components/Markdown";
import { Badge, Card, SeverityIcon } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(decodeURIComponent(id));
  if (!product) notFound();

  const db = getDb();
  const today = simDate(db);
  const history = priceHistory(db, product.id, addDays(today, -366));
  const snapshot = getSnapshot(db);
  const holding = snapshot.holdings.find((h) => h.product.id === product.id);
  const lots = getLots(db).filter((l) => l.productId === product.id);
  const price = history.at(-1)?.price ?? product.startPrice;
  const sellableCents = Math.round(
    unlockedUnits(getAvailableLots(db), product.id, today) * price * 100,
  );
  const deal = getDealFacts(product.id);
  const review = deal ? getDealReview(db, product.id) : null;
  const valuation = reviewValuation(product, history.slice(-12), today);
  const appraised = product.valuation.source !== "market";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/invest" className="text-xs text-muted hover:text-fg">
          ← Invest
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl text-fg">{product.name}</h1>
          <Badge>{SLEEVE_LABELS[product.sleeve]}</Badge>
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
              Scout {review.verdict} · {review.score}/100
            </Badge>
          )}
        </div>
        <p className="mt-2 max-w-3xl text-sm text-fg-2">{product.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <Card
            title={appraised ? "NAV per unit (appraisal marks)" : "Price"}
            subtitle={
              appraised
                ? "Appraised products only change value on appraisal dates."
                : `Last ${formatPrice(price)}`
            }
          >
            <LineChart
              points={history.map((p) => ({ date: p.date, value: p.price }))}
              format="price"
              stepped={appraised}
              label={`${product.name} price`}
            />
          </Card>

          {review && (
            <Card
              title="Scout's diligence memo"
              subtitle={`Reviewed ${formatDate(review.reviewedOn)}`}
            >
              <Markdown>{review.memo}</Markdown>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {review.flags.map((f) => (
                  <li
                    key={f.code}
                    className="flex items-start gap-2 rounded-lg border border-line p-2 text-xs"
                  >
                    <SeverityIcon
                      severity={
                        f.impact > 0
                          ? "good"
                          : f.severity === "fatal" || f.severity === "major"
                            ? "critical"
                            : "warn"
                      }
                    />
                    <span className="flex-1 text-fg-2">{f.label}</span>
                    <span className="text-muted tabular">
                      {f.impact > 0 ? "+" : ""}
                      {f.impact}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {lots.length > 0 && (
            <Card
              title="Your lots"
              subtitle="Each purchase has its own lock-up clock."
              bodyClassName="p-0"
            >
              <table className="w-full text-sm tabular">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="px-5 py-3 font-normal">Bought</th>
                    <th className="px-3 py-3 text-right font-normal">Units</th>
                    <th className="px-3 py-3 text-right font-normal">Cost</th>
                    <th className="px-3 py-3 text-right font-normal">Value</th>
                    <th className="px-5 py-3 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((l) => (
                    <tr key={l.id} className="border-t border-line">
                      <td className="px-5 py-3 text-fg-2">{formatDate(l.acquiredOn)}</td>
                      <td className="px-3 py-3 text-right text-fg-2">{l.units.toFixed(4)}</td>
                      <td className="px-3 py-3 text-right text-fg-2">{formatUsd(l.costCents)}</td>
                      <td className="px-3 py-3 text-right text-fg">
                        {formatUsd(Math.round(l.units * price * 100))}
                      </td>
                      <td className="px-5 py-3 text-xs text-fg-2">
                        {l.lockedUntil && l.lockedUntil > today
                          ? `🔒 until ${formatDate(l.lockedUntil)}`
                          : "Unlocked"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Trade">
            <TradeTicket
              productId={product.id}
              productName={product.name}
              sellableCents={sellableCents}
              cashCents={snapshot.cashCents}
              minTicketCents={product.minTicketCents}
              canBuy={product.status === "open" && review?.verdict !== "reject"}
              sellLabel={product.liquidity.redemption === "quarterly" ? "Redeem" : "Sell"}
            />
          </Card>

          <Card title="Terms">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Liquidity</dt>
                <dd className="text-right text-fg">{describeLiquidity(product)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Valuation</dt>
                <dd className="text-right text-fg">
                  {product.valuation.source === "market"
                    ? "Market price"
                    : product.valuation.appraiser}
                </dd>
              </div>
              {product.valuation.everyDays && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Re-marked</dt>
                  <dd className="text-right text-fg">Every {product.valuation.everyDays} days</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Minimum</dt>
                <dd className="text-right text-fg tabular">{formatUsd(product.minTicketCents)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Simulated expected return</dt>
                <dd className="text-right text-fg tabular">
                  {formatPct(product.annualDrift)} / yr
                </dd>
              </div>
              {holding && (
                <div className="flex justify-between gap-4 border-t border-line pt-3">
                  <dt className="text-muted">You hold</dt>
                  <dd className="text-right text-fg tabular">
                    {formatUsd(holding.valueCents)} ({formatPct(holding.weight)})
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {deal && (
            <Card title="Deal facts">
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                {[
                  ["Originator", deal.originator],
                  ["Sector", deal.sector],
                  ["Structure", deal.structure.replace("_", " ")],
                  ["Term", `${deal.termMonths} months`],
                  ["Target yield", `${deal.targetYieldPct}%`],
                  ["Audited financials", deal.auditedFinancials ? "Yes" : "No"],
                  ["Independent valuation", deal.independentValuation ? "Yes" : "No"],
                  ["Related party", deal.relatedParty ? "Yes" : "No"],
                  ["Circular financing", deal.circularFinancing ? "Yes" : "No"],
                  ["Leverage", deal.leverage === null ? "n/a" : `${deal.leverage.toFixed(1)}x`],
                  ["Track record", `${deal.trackRecordYears} years`],
                ].map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          {appraised && (
            <Card title="Ledger's valuation check">
              <ul className="space-y-2">
                {valuation.map((v) => (
                  <li key={v.code} className="flex gap-2 text-xs">
                    <SeverityIcon
                      severity={v.severity === "info" ? "good" : v.severity}
                      className="mt-0.5"
                    />
                    <span className="text-fg-2">
                      <span className="font-medium text-fg">{v.title}.</span> {v.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
