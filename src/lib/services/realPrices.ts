import { getMeta, setMeta, simDate, type Db } from "@/lib/db";
import { insertMany } from "@/lib/db/util";
import { addDays, diffDays, toIsoDate } from "@/lib/domain/dates";
import { benchmarkPrice, type Close } from "@/lib/domain/realPrices";
import { BENCHMARKS, fetchCloses, type Benchmark, type SourceId } from "@/lib/market/feeds";

/**
 * Real prices (`MYLIQUID_PRICES=real`): the market-priced products follow their public benchmarks' daily moves
 * (`BENCHMARKS`). Closes are fetched once per market day, before the market advances, into `market_quotes`; the
 * market clock (`advanceOneDay`) then prices each product from them, or from the simulation when a feed couldn't say.
 */

/** `MYLIQUID_PRICES`: real or simulated. Real by default on Vercel; simulated elsewhere (and in tests). */
export function realPricesEnabled(): boolean {
  const v = process.env.MYLIQUID_PRICES;
  if (v === "real") return true;
  if (v === "simulated") return false;
  return !!process.env.VERCEL;
}

/** How the site describes its prices, wherever it says the money is demo money. */
export function marketsNote(): string {
  return realPricesEnabled()
    ? "Index funds and bitcoin follow real prices; other products are simulated. Demo money"
    : "Simulated markets, demo money";
}

/** Closes are fetched from this many days before the market date, to cover weekends, holidays and catch-ups. */
const LOOKBACK_DAYS = 10;

export interface FeedStatus {
  productId: string;
  benchmark: string;
  symbol: string;
  ok: boolean;
  source: SourceId | null;
  lastClose: Close | null;
  error: string | null;
}

const fetchedKey = (symbol: string) => `quotes_fetched:${symbol}`;

/**
 * Fetches recent closes for every benchmark and stores them. Call it before advancing the market; it only goes out
 * when the market is behind the calendar (or `force`), so an ordinary page view never waits on a feed.
 */
export async function refreshQuotes(
  db: Db,
  opts: { force?: boolean; today?: string } = {},
): Promise<FeedStatus[]> {
  if (!realPricesEnabled()) return [];
  const today = opts.today ?? toIsoDate(new Date());
  const from = addDays(simDate(db), -LOOKBACK_DAYS);
  if (!opts.force && diffDays(simDate(db), today) <= 0) return [];
  const results = await Promise.allSettled(
    Object.entries(BENCHMARKS).map(async ([productId, b]) => {
      const { source, closes } = await fetchCloses(b, from, today);
      return { productId, b, source, closes };
    }),
  );
  return results.map((r, i) => {
    const [productId, b] = Object.entries(BENCHMARKS)[i]!;
    if (r.status === "rejected")
      return status(productId, b, null, null, String(r.reason?.message ?? r.reason));
    const { source, closes } = r.value;
    insertMany(
      db,
      "INSERT OR REPLACE INTO market_quotes (symbol, date, close, source)",
      closes.map((c) => [b.symbol, c.date, c.close, source]),
    );
    setMeta(db, fetchedKey(b.symbol), today);
    return status(productId, b, source, closes.at(-1) ?? null, null);
  });
}

function status(
  productId: string,
  b: Benchmark,
  source: SourceId | null,
  lastClose: Close | null,
  error: string | null,
): FeedStatus {
  return { productId, benchmark: b.name, symbol: b.symbol, ok: !error, source, lastClose, error };
}

/**
 * The real price of `productId` on market day `date` (from `previous`, its last price) and the label stored with it
 * ("SPY close 2026-10-15 via yahoo"), or null to simulate the day. `rebase` is set on the first real day of an asset
 * that takes its benchmark's level (`rebaseToReal`).
 */
export function realPrice(
  db: Db,
  productId: string,
  previous: number,
  date: string,
): { price: number; feed: string; rebase: boolean } | null {
  const b = BENCHMARKS[productId];
  if (!b || !realPricesEnabled()) return null;
  const closes = db
    .prepare(
      "SELECT date, close, source FROM market_quotes WHERE symbol = ? AND date >= ? AND date < ? ORDER BY date",
    )
    .all(b.symbol, addDays(date, -LOOKBACK_DAYS - 2), date) as (Close & { source: string })[];
  const fetchedOn = getMeta(db, fetchedKey(b.symbol)) ?? null;
  const priced = benchmarkPrice(b.follow, previous, closes, date, fetchedOn);
  if (!priced) return null;
  const source = closes.find((c) => c.date === priced.close.date)?.source;
  const rebase =
    b.follow === "level" &&
    !db
      .prepare("SELECT 1 FROM prices WHERE product_id = ? AND feed IS NOT NULL LIMIT 1")
      .get(productId);
  return {
    price: priced.price,
    feed: `${b.symbol} close ${priced.close.date} via ${source}`,
    rebase,
  };
}

/**
 * The first time an asset takes its real price (bitcoin), its simulated past is re-denominated so nobody's holding
 * jumps: past prices and open limit prices scale by `factor` (real / simulated), and every holding's units by
 * 1 / factor, so each lot keeps its value and cost and the chart stays continuous. Run inside the market's transaction.
 */
export function rebaseToReal(db: Db, productId: string, factor: number): void {
  if (!Number.isFinite(factor) || factor <= 0) throw new Error(`Bad rebase factor ${factor}`);
  db.prepare("UPDATE prices SET price = price * ? WHERE product_id = ?").run(factor, productId);
  db.prepare("UPDATE lots SET units = units / ? WHERE product_id = ?").run(factor, productId);
  db.prepare(
    "UPDATE limit_orders SET limit_price = limit_price * ? WHERE product_id = ? AND status = 'open'",
  ).run(factor, productId);
  setMeta(db, `rebased:${productId}`, String(factor));
}

/** What each market-priced product follows and where its latest price came from, for the Invest page and health. */
export function priceFeeds(db: Db): {
  productId: string;
  benchmark: string;
  follow: Benchmark["follow"];
  latest: { date: string; feed: string | null } | null;
}[] {
  if (!realPricesEnabled()) return [];
  return Object.entries(BENCHMARKS).map(([productId, b]) => {
    const latest = db
      .prepare("SELECT date, feed FROM prices WHERE product_id = ? ORDER BY date DESC LIMIT 1")
      .get(productId) as { date: string; feed: string | null } | undefined;
    return { productId, benchmark: b.name, follow: b.follow, latest: latest ?? null };
  });
}
