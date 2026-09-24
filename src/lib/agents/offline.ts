import { PRODUCTS } from "@/lib/domain/catalog";
import { parseAmountToCents } from "@/lib/domain/money";
import type { AgentId } from "@/lib/domain/types";
import { logEvent } from "@/lib/services/audit";
import { getSnapshot } from "@/lib/services/portfolio";
import { getProfile } from "@/lib/services/repo";
import type { DeskEvent } from "./events";
import { compactJson } from "./llm";
import { TOOLS, invokeTool, type ToolContext, type ToolOutcome } from "./tools";

/**
 * Offline mode: deterministic agents that call the same tools as the Claude-powered
 * ones. The platform stays fully usable without an API key, and the guardrails
 * are identical.
 */

type Obj = Record<string, unknown>;
type Row = Record<string, string | number | boolean | null | undefined | string[]>;

function caller(ctx: ToolContext, emit: (e: DeskEvent) => void) {
  return (name: string, input: Obj = {}): ToolOutcome => {
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) throw new Error(`Unknown tool ${name}`);
    emit({ type: "tool_call", agent: ctx.agent, tool: name, input });
    const outcome = invokeTool(tool, input, ctx);
    logEvent(ctx.db, ctx.investorId, {
      runId: ctx.runId,
      agent: ctx.agent,
      kind: "tool_call",
      title: `${name}(${compactJson(input)})`,
      payload: { input, ok: outcome.ok },
    });
    emit({
      type: "tool_result",
      agent: ctx.agent,
      tool: name,
      ok: outcome.ok,
      result: outcome.result,
    });
    return outcome;
  };
}

const rows = (result: Obj, key: string) => (result[key] as Row[] | undefined) ?? [];

// ── Routines ────────────────────────────────────────────────────────────────

export function runOfflineRoutine(
  agent: AgentId,
  ctx: ToolContext,
  emit: (e: DeskEvent) => void,
): string {
  const call = caller(ctx, emit);
  switch (agent) {
    case "ledger":
      return ledgerRoutine(call);
    case "scout":
      return scoutRoutine(call);
    case "sentinel":
      return sentinelRoutine(call);
    case "atlas":
      return atlasRoutine(call);
    case "quant":
      return quantRoutine(call, ctx);
    default:
      return "Nothing to do.";
  }
}

type Call = ReturnType<typeof caller>;

function ledgerRoutine(call: Call): string {
  const findings = rows(call("review_valuations").result, "findings");
  const critical = findings.filter((f) => f.severity === "critical");
  const warn = findings.filter((f) => f.severity === "warn");
  const fresh = findings.filter((f) => f.finding === "fresh");
  const lines = [
    `Reviewed ${new Set(findings.map((f) => f.product)).size} privately valued products.`,
  ];
  if (critical.length) {
    lines.push(
      "",
      "**Do not trust these marks:**",
      ...critical.map((f) => `- ${f.product}${f.held ? " (you hold this)" : ""}: ${f.detail}`),
    );
  }
  if (warn.length)
    lines.push(
      "",
      "**Stale marks:**",
      ...warn.map((f) => `- ${f.product}${f.held ? " (you hold this)" : ""}: ${f.detail}`),
    );
  lines.push(
    "",
    `${fresh.length} product${fresh.length === 1 ? " is" : "s are"} independently appraised and current.`,
  );
  return lines.join("\n");
}

function scoutRoutine(call: Call): string {
  const deals = rows(call("list_deals").result, "deals");
  const reviewed = deals.map((d) => call("review_deal", { productId: d.id }).result);
  const ranked = reviewed.sort((a, b) => Number(b.score) - Number(a.score));
  const icon = (v: unknown) => (v === "approve" ? "✅" : v === "watchlist" ? "⚠️" : "⛔");
  const lines = ["Re-screened every private deal:", ""];
  for (const r of ranked) {
    const name = deals.find((d) => d.id === r.productId)?.name ?? r.productId;
    const flags = (r.flags as { label: string; impact: number }[])
      .filter((f) => f.impact < 0)
      .map((f) => f.label);
    lines.push(
      `- ${icon(r.verdict)} **${name}**: ${r.score}/100, ${String(r.verdict)}${flags.length ? ` (${flags.slice(0, 3).join("; ")})` : ""}`,
    );
  }
  const rejected = ranked.filter((r) => r.verdict === "reject");
  if (rejected.length) {
    lines.push(
      "",
      "Rejected deals can't be bought on MyLiquid. They show the pattern behind frozen funds: circular financing, related parties and marks the originator sets itself.",
    );
  }
  return lines.join("\n");
}

function sentinelRoutine(call: Call): string {
  const findings = rows(call("check_portfolio_risk").result, "findings");
  const buckets = rows(call("get_liquidity_ladder").result, "buckets");
  const pick = (label: string) => buckets.find((b) => b.bucket === label)?.cumulativeShare ?? "0%";
  const breaches = findings.filter((f) => f.severity !== "info");
  const lines = [
    breaches.length
      ? `**${breaches.length} limit issue${breaches.length === 1 ? "" : "s"}:**`
      : "All limits are within your risk profile.",
    ...breaches.map((f) => `- ${f.severity === "critical" ? "🔴" : "🟠"} ${f.title}: ${f.detail}`),
    "",
    `**Liquidity:** ${pick("Today")} available today, ${pick("Within 7 days")} within 7 days, ${pick("Within 90 days")} within 90 days, ${pick("Within 1 year")} within a year.`,
  ];
  return lines.join("\n");
}

function atlasRoutine(call: Call): string {
  const plan = call("plan_rebalance").result;
  const drift = rows(plan, "drift")
    .filter((d) => Math.abs(Number(d.driftPp)) >= 3)
    .map(
      (d) =>
        `- ${d.sleeve}: ${d.current} vs ${d.target} target (${Number(d.driftPp) > 0 ? "+" : ""}${d.driftPp}pp)`,
    );
  const trades = rows(plan, "trades");
  const notes = (plan.notes as string[]) ?? [];
  const lines = [
    drift.length ? "**Drift beyond 3 points:**" : "Allocation is on target.",
    ...drift,
  ];
  if (trades.length) {
    const res = call("propose_rebalance", {
      rationale:
        "Bring the portfolio back to its target allocation. Liquid sleeves are funded first, and locked positions are never sold.",
    }).result;
    if (res.outcome === "proposed") {
      lines.push(
        "",
        `Proposed a rebalance with ${(res.orders as string[]).length} orders for your approval.`,
      );
    } else if (res.outcome === "already_pending") {
      lines.push("", "A rebalance proposal is already waiting for your approval.");
    } else {
      lines.push("", `Could not propose: ${String(res.error ?? res.reason ?? res.outcome)}`);
    }
  }
  if (notes.length) lines.push("", ...notes.map((n) => `- ${n}`));
  return lines.join("\n");
}

function quantRoutine(call: Call, ctx: ToolContext): string {
  const signals = rows(call("get_market_signals").result, "signals");
  const rules = rows(call("list_autopilot_rules").result, "rules");
  const lines = [
    "**Signals:**",
    ...signals.map(
      (s) =>
        `- ${s.name}: ${s.trend} (${s.strength}), 30d ${s.return30d}, ${s.drawdownFromHigh} from high`,
    ),
  ];

  // At most one tactical trim: an overweight liquid sleeve that is also in a downtrend.
  const snap = getSnapshot(ctx.db, ctx.investorId);
  const profile = getProfile(ctx.db, ctx.investorId);
  const candidates = signals
    .filter((s) => s.trend === "downtrend")
    .map((s) => {
      const product = PRODUCTS.find((p) => p.id === s.id)!;
      const over = snap.sleeves[product.sleeve].weight - profile.targets[product.sleeve];
      return { s, product, over };
    })
    .filter((c) => c.over > 0.03)
    .sort((a, b) => b.over - a.over);
  const pick = candidates[0];
  if (pick) {
    const holding = snap.holdings.find((h) => h.product.id === pick.product.id);
    const amount = Math.min(
      Math.round((pick.over * snap.totalCents) / 100),
      Math.floor((holding?.valueCents ?? 0) / 100),
    );
    if (amount >= 100) {
      const res = call("propose_trade", {
        productId: pick.product.id,
        side: "sell",
        amountUsd: amount,
        rationale: `${pick.product.name} is in a downtrend and its sleeve is ${(pick.over * 100).toFixed(1)} points over target.`,
      }).result;
      lines.push(
        "",
        `Trim ${pick.product.id}: ${String(res.outcome)}${res.whyNotAutomatic ? `. ${String(res.whyNotAutomatic)}` : ""}`,
      );
    }
  } else {
    lines.push("", "No trade: no overweight position is in a downtrend.");
  }
  lines.push("", `${rules.filter((r) => r.status === "active").length} active autopilot rule(s).`);
  return lines.join("\n");
}

// ── Copilot ─────────────────────────────────────────────────────────────────

// Specific names first so "the Nordhavn shipyard bond" doesn't match the bond index.
const ALIASES: [RegExp, string][] = [
  [/\bharbor\b/, "DL-HARBOR"],
  [/\b(solaris|solar)\b/, "DL-SOLAR"],
  [/\b(verdant|clinics?)\b/, "DL-VERDANT"],
  [/\b(bakehouse|bakery)\b/, "DL-BAKE"],
  [/\bcedar\b/, "DL-CEDAR"],
  [/\b(nordhavn|shipyard)\b/, "DL-NORDHAVN"],
  [/\b(main street|revenue share fund)\b/, "MLMS"],
  [/\bprivate credit\b/, "MLPC"],
  [/\bgrowth equity fund\b/, "MLGE"],
  [/\b(momentum|quant strategy)\b/, "MLQM"],
  [/\b(btc|bitcoin)\b/, "BTC"],
  [/\b(s&p|us large|large cap|500)\b/, "MLUS"],
  [/\b(global equity|global index|world)\b/, "MLWX"],
  [/\bbonds?\b/, "MLBD"],
];

export function matchProduct(text: string): string | null {
  const t = text.toLowerCase();
  const byId = PRODUCTS.find((p) => t.includes(p.id.toLowerCase()));
  if (byId) return byId.id;
  for (const [re, id] of ALIASES) if (re.test(t)) return id;
  return null;
}

function findAmountCents(text: string): number | null {
  const m = text.match(
    /\$\s?[\d,]+(?:\.\d+)?\s*[km]?\b|\b[\d,]+(?:\.\d+)?\s*[km]\b|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d{3,}(?:\.\d+)?\b/i,
  );
  return m ? parseAmountToCents(m[0].replace(/\s+/g, "")) : null;
}

const HELP = [
  "Try asking me to:",
  "- *How liquid am I?* (Sentinel's liquidity ladder)",
  "- *Any risk issues?* (Sentinel's limit check)",
  "- *Rebalance my portfolio* (Atlas proposes, you approve)",
  "- *Buy $2,000 of the global index* or *sell $1k bitcoin*",
  "- *Review the Nordhavn deal* (Scout's red-flag memo)",
  "- *Are the valuations fresh?* (Ledger)",
  "- *If bitcoin falls 20% from its high, buy $1,000* (Quant autopilot rule)",
].join("\n");

export function offlineCopilot(
  message: string,
  ctx: ToolContext,
  emit: (e: DeskEvent) => void,
): string {
  const call = caller(ctx, emit);
  const t = message.toLowerCase();
  const productId = matchProduct(t);
  const amount = findAmountCents(t);

  // Withdrawals are human-only.
  if (/\b(withdraw|cash out|send .* bank|transfer out)\b/.test(t)) {
    const ladder = rows(call("get_liquidity_ladder").result, "buckets");
    return [
      "Withdrawals to your bank are **human-only**. No agent can move money off the platform. Use **Cash → Withdraw** on the dashboard.",
      "",
      `What you could withdraw: ${ladder[0]?.value ?? "$0"} today, ${ladder[1]?.cumulative ?? "$0"} within 7 days.`,
    ].join("\n");
  }

  if (/\b(pause|stop) (all|every)|kill switch|emergency stop/.test(t)) {
    call("pause_all_agents", { reason: `Investor asked the Copilot: "${message.slice(0, 120)}"` });
    return "**Sentinel**: all agents and autopilot rules are paused. Only you can resume them, in Settings.";
  }

  // Autopilot rule: "if/when X falls below $Y (or N%), buy/sell $Z"
  if (/\b(if|when|whenever)\b/.test(t) && /\b(buy|sell)\b/.test(t) && productId) {
    const action = /\bsell\b/.test(t) ? "sell" : "buy";
    const actionAmount = t.match(/\b(?:buy|sell)\s+(\$?\s?[\d,.]+\s*[km]?)/);
    const amountCents = actionAmount?.[1]
      ? parseAmountToCents(actionAmount[1].replace(/\s+/g, ""))
      : amount;
    const pct = t.match(/(\d+(?:\.\d+)?)\s*%/);
    const price = t.match(/(?:below|under|above|over)\s+\$?\s?([\d,]+(?:\.\d+)?\s*[km]?)/);
    let condition: string | null = null;
    let threshold = 0;
    if (pct && /(fall|drop|dip|down|crash)/.test(t)) {
      condition = "drawdown_below";
      threshold = -Number(pct[1]) / 100;
    } else if (price?.[1]) {
      condition = /(above|over)/.test(t) ? "price_above" : "price_below";
      threshold = (parseAmountToCents(price[1].replace(/\s+/g, "")) ?? 0) / 100;
    }
    if (condition && amountCents) {
      const res = call("create_autopilot_rule", {
        productId,
        condition,
        threshold,
        action,
        amountUsd: amountCents / 100,
      }).result;
      if (res.error) return `**Quant**: I couldn't create that rule: ${String(res.error)}`;
      return `**Quant** compiled your strategy into a rule:\n\n> ${String(res.rule)}\n\nIt was created **paused**. Activate it on the Autopilot page. When it fires, it still goes through Sentinel's checks and your autonomy settings.`;
    }
    return "**Quant**: I can build rules like *If bitcoin falls 20% from its high, buy $1,000* or *When MLWX drops below $95, buy $2,000*. Which condition and amount do you want?";
  }

  if (/\brebalanc/.test(t)) {
    const res = call("propose_rebalance", {
      rationale: "Investor asked the Copilot to rebalance to target.",
    }).result;
    if (res.outcome === "proposed") {
      return [
        `**Atlas** proposed a rebalance (${(res.orders as string[]).length} orders). Review and approve it in your inbox:`,
        "",
        ...(res.orders as string[]).map((o) => `- ${o}`),
        ...((res.notes as string[]) ?? []).map((n) => `- ${n}`),
      ].join("\n");
    }
    if (res.outcome === "already_pending")
      return "**Atlas**: a rebalance proposal is already waiting in your inbox.";
    if (res.error) return `**Atlas**: ${String(res.error)}`;
    return `**Atlas**: nothing to rebalance. ${((res.notes as string[]) ?? []).join(" ")}`;
  }

  const tradeVerb = t.match(/\b(buy|sell|invest|put|trim|add)\b/);
  if (tradeVerb && productId) {
    if (!amount) return `How much? For example: *${tradeVerb[1]} $1,000 of ${productId}*.`;
    const side = /\b(sell|trim)\b/.test(t) ? "sell" : "buy";
    const res = call("propose_trade", {
      productId,
      side,
      amountUsd: amount / 100,
      rationale: `Investor asked the Copilot: "${message.slice(0, 200)}"`,
    }).result;
    if (res.error) return `**Sentinel**: ${String(res.error)}`;
    if (res.outcome === "executed")
      return `Done: ${side === "buy" ? "bought" : "sold"} ${String(res.amount)} of ${productId} within your agent mandate.`;
    if (res.outcome === "proposed")
      return `**Sentinel** approved the checks. The trade is waiting in your inbox for one-tap approval.\n\n_${String(res.whyNotAutomatic)}_`;
    return [
      "**Sentinel blocked this trade:**",
      ...rows(res, "checks").map((c) => `- ${c.check}: ${c.detail}`),
    ].join("\n");
  }

  if (
    /\b(deal|diligence|red flag|scout|private deal)\b/.test(t) ||
    (productId?.startsWith("DL-") ?? false)
  ) {
    if (productId?.startsWith("DL-")) {
      const res = call("review_deal", { productId }).result;
      return `**Scout's memo**\n\n${String(res.memo)}`;
    }
    const deals = rows(call("list_deals").result, "deals");
    return [
      "**Scout's deal board:**",
      "",
      ...deals.map(
        (d) =>
          `- **${d.name}** (${d.targetYield}, ${d.lockup} lock): ${d.verdict}${d.score !== null ? `, ${d.score}/100` : ""}`,
      ),
      "",
      "Ask me about any deal by name for the full memo.",
    ].join("\n");
  }

  if (/\b(valu|mark|nav|apprais|ledger)/.test(t)) {
    const findings = rows(call("review_valuations").result, "findings").filter(
      (f) => f.severity !== "info",
    );
    return findings.length
      ? [
          "**Ledger's valuation flags:**",
          ...findings.map(
            (f) =>
              `- ${f.severity === "critical" ? "🔴" : "🟠"} ${f.product}${f.held ? " (held)" : ""}: ${f.detail}`,
          ),
        ].join("\n")
      : "**Ledger**: every private mark is independent and current.";
  }

  if (/\b(liquid|liquidity|ladder|lock|locked|access|how fast|get my money)\b/.test(t)) {
    const buckets = rows(call("get_liquidity_ladder").result, "buckets");
    return [
      "**Sentinel's liquidity ladder** (cumulative):",
      "",
      "| When | Available | Share |",
      "|---|---:|---:|",
      ...buckets.map((b) => `| ${b.bucket} | ${b.cumulative} | ${b.cumulativeShare} |`),
    ].join("\n");
  }

  if (/\b(risk|limit|breach|sentinel|safe|exposure)\b/.test(t)) {
    const findings = rows(call("check_portfolio_risk").result, "findings");
    return [
      "**Sentinel's risk check:**",
      ...findings.map(
        (f) =>
          `- ${f.severity === "critical" ? "🔴" : f.severity === "warn" ? "🟠" : "🟢"} ${f.title}: ${f.detail}`,
      ),
    ].join("\n");
  }

  if (/\b(signal|trend|momentum|market|price|prices)\b/.test(t)) {
    const signals = rows(call("get_market_signals").result, "signals");
    return [
      "**Quant's signals:**",
      "",
      "| Asset | Price | Trend | 30d | From high |",
      "|---|---:|---|---:|---:|",
      ...signals.map(
        (s) => `| ${s.name} | ${s.price} | ${s.trend} | ${s.return30d} | ${s.drawdownFromHigh} |`,
      ),
    ].join("\n");
  }

  if (/\b(rule|rules|autopilot)\b/.test(t)) {
    const rules = rows(call("list_autopilot_rules").result, "rules");
    return rules.length
      ? ["**Your autopilot rules:**", ...rules.map((r) => `- ${r.rule} (${r.status})`)].join("\n")
      : "You have no autopilot rules yet. Try: *If bitcoin falls 20% from its high, buy $1,000*.";
  }

  if (/\b(activity|happened|recent|log|audit)\b/.test(t)) {
    const res = call("get_recent_activity", { limit: 8 }).result;
    return [
      "**Recent activity:**",
      ...rows(res, "events").map((e) => `- ${e.at} · ${e.agent}: ${e.event}`),
    ].join("\n");
  }

  // Default: portfolio overview
  const p = call("get_portfolio").result;
  const sleeves = rows(p, "sleeves");
  return [
    `**Your portfolio: ${String(p.total)}** (${(p.riskProfile as Obj).name} profile, ${String(p.availableCash)} cash available)`,
    "",
    "| Sleeve | Weight | Target |",
    "|---|---:|---:|",
    ...sleeves.map((s) => `| ${s.sleeve} | ${s.weight} | ${s.target} |`),
    "",
    HELP,
  ].join("\n");
}
