/**
 * Do real prices work? 1. Fetches the last month of closes for every benchmark from its source. 2. Runs MyLiquid's
 * own market clock on a fresh database started a week ago, with real prices on, and shows what priced each day.
 * Run on a GitHub runner (.github/workflows/market-data.yml), or anywhere with internet:
 *   npx tsx scripts/market-data-check.ts
 */
import { BENCHMARKS, clean, SOURCES, type SourceId } from "../src/lib/market/feeds";

const to = new Date().toISOString().slice(0, 10);
const from = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
let anyFailed = false;
const lines: string[] = [];
const ok = (l: string) => lines.push(`✅ ${l}`);
const bad = (l: string) => {
  lines.push(`❌ ${l}`);
  anyFailed = true;
};

for (const [productId, b] of Object.entries(BENCHMARKS)) {
  const s: SourceId = b.kind === "crypto" ? "coinbase" : "yahoo";
  try {
    const closes = clean(await SOURCES[s](b.symbol, from, to), from, to);
    const last = closes.at(-1);
    ok(
      `${productId} ← ${b.symbol} via ${s}: ${closes.length} closes, last ${last?.date} = ${last?.close}`,
    );
  } catch (e) {
    bad(`${productId} ← ${b.symbol} via ${s}: ${e instanceof Error ? e.message : e}`);
  }
}

// 2. The market clock itself, end to end, on an in-memory database.
process.env.MYLIQUID_PRICES = "real";
process.env.MYLIQUID_MARKET_CLOCK = "calendar";
const { openDatabase, simDate } = await import("../src/lib/db");
const { ensureMarketCurrent } = await import("../src/lib/services/sim");
const start = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
const db = openDatabase(":memory:", { today: start });
const days = await ensureMarketCurrent(db);
if (simDate(db) === to) ok(`Market clock: ${start} → ${simDate(db)} (${days} days)`);
else bad(`Market clock stopped at ${simDate(db)}, expected ${to}`);
for (const productId of Object.keys(BENCHMARKS)) {
  const rows = db
    .prepare("SELECT date, price, feed FROM prices WHERE product_id = ? AND date > ? ORDER BY date")
    .all(productId, start) as { date: string; price: number; feed: string | null }[];
  const real = rows.filter((r) => r.feed);
  const last = rows.at(-1);
  const line = `${productId}: ${real.length}/${rows.length} days on real prices; ${last?.date} = ${last?.price.toFixed(2)} (${last?.feed ?? "simulated"})`;
  if (real.length === rows.length && rows.length > 0) ok(line);
  else bad(line);
}

console.log(lines.join("\n"));
// On GitHub, each result is also an annotation, so it shows on the run's page (and through the API) without logs.
if (process.env.GITHUB_ACTIONS)
  for (const l of lines) console.log(`::${l.startsWith("❌") ? "warning" : "notice"}::${l}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, "```\n" + lines.join("\n") + "\n```\n");
}
process.exitCode = anyFailed ? 1 : 0;
