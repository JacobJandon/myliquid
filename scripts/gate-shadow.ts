/**
 * MyLiquid Gate in shadow mode, out of band (src/lib/gate/shadow.ts): replays a log of agent MCP calls through the
 * same decision the guardrail proxy makes and writes what Gate would have done. Runs on this machine only; nothing
 * is sent anywhere.
 *
 *   npx tsx scripts/gate-shadow.ts <config.json> <calls.jsonl> [--out shadow/]
 *
 * The config is the proxy's ({ policy, tools }; `upstream` is ignored), so the rules a firm tries in shadow are the
 * rules it later enforces. Writes <out>/report.md and <out>/decisions.jsonl.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { replayShadow, shadowLine, shadowReport, type ShadowConfig } from "../src/lib/gate/shadow";

const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const out = outAt >= 0 ? args[outAt + 1] : "shadow";
const [configPath, logPath] = args.filter((_, i) => i !== outAt && i !== outAt + 1);
if (!configPath || !logPath || !out) {
  console.error(
    "Usage: npx tsx scripts/gate-shadow.ts <config.json> <calls.jsonl> [--out shadow/]",
  );
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, "utf8")) as ShadowConfig;
if (!config.policy || !Array.isArray(config.tools)) {
  console.error(`${configPath} needs "policy" and "tools" (the guardrail proxy's config).`);
  process.exit(1);
}
const result = replayShadow(config, readFileSync(logPath, "utf8"));

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "report.md"), shadowReport(result));
writeFileSync(
  join(out, "decisions.jsonl"),
  result.decided.map((d) => shadowLine(d) + "\n").join(""),
);

const count = (o: string) => result.decided.filter((d) => d.decision.decision === o).length;
console.log(
  `${result.decided.length} money-moving calls: ${count("allow")} allowed, ${count("review")} to a person, ` +
    `${count("block")} blocked. ${result.unreadable.length} lines unreadable. Report: ${join(out, "report.md")}`,
);
