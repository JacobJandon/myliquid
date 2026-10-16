/**
 * Are the real price feeds reachable and sane? Fetches the last month of closes for every benchmark from every
 * source and prints what came back. Run on a GitHub runner (.github/workflows/market-data.yml), or anywhere with
 * internet: npx tsx scripts/market-data-check.ts
 */
import { BENCHMARKS, SOURCES, type SourceId } from "../src/lib/market/feeds";

const to = new Date().toISOString().slice(0, 10);
const from = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
let anyFailed = false;
const lines: string[] = [`Real price feeds, ${from} to ${to}`, ""];
for (const [productId, b] of Object.entries(BENCHMARKS)) {
  const sources: SourceId[] = b.kind === "crypto" ? ["coinbase"] : ["stooq", "yahoo"];
  for (const s of sources) {
    try {
      const closes = (await SOURCES[s](b.symbol, from, to)).filter((c) => c.date >= from);
      const last = closes.at(-1);
      lines.push(
        `✅ ${productId} ← ${b.symbol} via ${s}: ${closes.length} closes, last ${last?.date} = ${last?.close}`,
      );
    } catch (e) {
      lines.push(`❌ ${productId} ← ${b.symbol} via ${s}: ${e instanceof Error ? e.message : e}`);
      anyFailed = true;
    }
  }
}
console.log(lines.join("\n"));
// On GitHub, each result is also an annotation, so it shows on the run's page (and through the API) without logs.
if (process.env.GITHUB_ACTIONS)
  for (const l of lines.slice(2)) console.log(`::${l.startsWith("❌") ? "warning" : "notice"}::${l}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, "```\n" + lines.join("\n") + "\n```\n");
}
process.exitCode = anyFailed ? 1 : 0;
