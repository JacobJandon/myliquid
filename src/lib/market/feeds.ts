/**
 * Real end-of-day prices for the market-priced products (`MYLIQUID_PRICES=real`). Each product follows a public
 * benchmark's daily moves (`BENCHMARKS`); the feeds here only fetch daily closes, never anything about investors.
 * Sources need no key: Coinbase's public candles for bitcoin; Stooq, then Yahoo's chart API, for funds. Every fetch is
 * time-boxed, and any failure just means the simulation prices that day (the price row says which).
 */

export interface DailyClose {
  date: string;
  close: number;
}

export interface Benchmark {
  /** What the product follows, as shown to investors. */
  name: string;
  /** Ticker on the fund feeds (Stooq, Yahoo), or a Coinbase product for crypto. */
  symbol: string;
  kind: "fund" | "crypto";
}

/** Which public benchmark each market-priced product follows. The rest (strategies, private assets) stay simulated. */
export const BENCHMARKS: Record<string, Benchmark> = {
  MLWX: { name: "Vanguard Total World Stock ETF (VT)", symbol: "VT", kind: "fund" },
  MLUS: { name: "SPDR S&P 500 ETF (SPY)", symbol: "SPY", kind: "fund" },
  MLBD: { name: "Vanguard Total World Bond ETF (BNDW)", symbol: "BNDW", kind: "fund" },
  BTC: { name: "Bitcoin (BTC-USD)", symbol: "BTC-USD", kind: "crypto" },
};

const TIMEOUT_MS = 4_000;
const UA = "MyLiquid/1.0 (+https://github.com/JacobJandon/myliquid)";

async function get(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "*/*" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const ymd = (iso: string) => iso.replace(/-/g, "");
const isoDay = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString().slice(0, 10);

function clean(points: DailyClose[], from: string, to: string): DailyClose[] {
  const byDate = new Map<string, number>();
  for (const p of points)
    if (p.date >= from && p.date <= to && Number.isFinite(p.close) && p.close > 0)
      byDate.set(p.date, p.close);
  return [...byDate].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, close]) => ({ date, close }));
}

/** Stooq's daily CSV (Date,Open,High,Low,Close,Volume). */
export function parseStooq(csv: string): DailyClose[] {
  const lines = csv.trim().split(/\r?\n/);
  if (!/^Date,/i.test(lines[0] ?? "")) throw new Error(lines[0]?.slice(0, 80) || "empty answer");
  return lines.slice(1).map((l) => {
    const c = l.split(",");
    return { date: c[0]!, close: Number(c[4]) };
  });
}

/** Yahoo's chart API: timestamps (session open, exchange time) and closes. */
export function parseYahoo(body: string): DailyClose[] {
  const r = JSON.parse(body)?.chart?.result?.[0];
  const ts: number[] = r?.timestamp ?? [];
  const closes: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
  const offset: number = r?.meta?.gmtoffset ?? 0;
  if (!ts.length) throw new Error(JSON.parse(body)?.chart?.error?.description ?? "no data");
  return ts.map((t, i) => ({ date: isoDay(t + offset), close: Number(closes[i]) }));
}

/** Coinbase candles: [time, low, high, open, close, volume], one per UTC day. */
export function parseCoinbase(body: string): DailyClose[] {
  const rows = JSON.parse(body);
  if (!Array.isArray(rows)) throw new Error(rows?.message ?? "no data");
  return rows.map((r: number[]) => ({ date: isoDay(r[0]!), close: Number(r[4]) }));
}

export const SOURCES = {
  stooq: async (symbol: string, from: string, to: string) =>
    parseStooq(
      await get(
        `https://stooq.com/q/d/l/?s=${symbol.toLowerCase()}.us&d1=${ymd(from)}&d2=${ymd(to)}&i=d`,
      ),
    ),
  yahoo: async (symbol: string, from: string, to: string) => {
    const p1 = Math.floor(Date.parse(from) / 1000);
    const p2 = Math.floor(Date.parse(to) / 1000) + 86_400;
    return parseYahoo(
      await get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${p1}&period2=${p2}&interval=1d`,
      ),
    );
  },
  coinbase: async (symbol: string, from: string, to: string) =>
    parseCoinbase(
      await get(
        `https://api.exchange.coinbase.com/products/${symbol}/candles?granularity=86400&start=${from}T00:00:00Z&end=${to}T23:59:59Z`,
      ),
    ),
} as const;

export type SourceId = keyof typeof SOURCES;

/** Daily closes for a benchmark from `from` to `to` (inclusive), trying each source in turn. */
export async function fetchCloses(
  b: Benchmark,
  from: string,
  to: string,
): Promise<{ source: SourceId; closes: DailyClose[] }> {
  const order: SourceId[] = b.kind === "crypto" ? ["coinbase"] : ["stooq", "yahoo"];
  const errors: string[] = [];
  for (const source of order) {
    try {
      const closes = clean(await SOURCES[source](b.symbol, from, to), from, to);
      if (closes.length) return { source, closes };
      errors.push(`${source}: no closes`);
    } catch (e) {
      errors.push(`${source}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`${b.symbol}: ${errors.join("; ")}`);
}
