import { ainraMode } from "@/lib/ainra";
import { formatUsd } from "@/lib/domain/money";
import type { GateOutcome, GatePolicy } from "./engine";
import { decideToolCall, memoryUsage, type ProxyCall, type ToolRule } from "./proxy";

/**
 * Shadow mode, out of band: replays a log of the MCP calls a firm's customers' agents made (mirrored traffic or the
 * firm's own log) through the same decision the guardrail proxy makes, and reports what Gate would have allowed,
 * sent to a person, or blocked. Nothing is forwarded or sent anywhere, and nothing sits in the firm's order path.
 *
 * One JSON object per line:
 *   { "at": "2026-12-08T14:03:11Z", "request": { "jsonrpc": "2.0", "method": "tools/call", "params": { ... } },
 *     "headers": { "x-ainra-passport": "..." } }                                  // headers optional
 *
 * Calls are replayed in time order with usage counted as if Gate had been enforcing (only allowed calls use up the
 * daily limit and the hourly rate). A line it can't read is listed with the reason, never guessed at; a money-moving
 * call whose amount it can't read is blocked, exactly as the proxy would.
 */

export interface ShadowConfig {
  policy: GatePolicy;
  tools: ToolRule[];
}

export interface ShadowDecision extends ProxyCall {
  /** 1-based line in the log. */
  line: number;
  at: string;
}

export interface ShadowResult {
  /** Non-blank lines read. */
  lines: number;
  /** Money-moving calls, with Gate's decision, in time order. */
  decided: ShadowDecision[];
  /** Calls that don't move money (the proxy passes them straight through), by tool or method. */
  passedThrough: Record<string, number>;
  /** Lines Gate could not decide, and why. */
  unreadable: { line: number; reason: string }[];
  /** First and last call time replayed. */
  from: string | null;
  to: string | null;
}

interface RpcMessage {
  method?: unknown;
  params?: { name?: unknown; arguments?: unknown; _meta?: Record<string, unknown> };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** The passport's verification time: when the call was made (a testbed passport keeps its pinned clock). */
const passportClock = (at: Date) =>
  ainraMode() === "testbed" ? undefined : Math.floor(at.getTime() / 1000);

export function replayShadow(config: ShadowConfig, log: string): ShadowResult {
  const rules = new Map(config.tools.map((r) => [r.tool, r]));
  const unreadable: ShadowResult["unreadable"] = [];
  const passedThrough: Record<string, number> = {};
  const calls: { line: number; at: Date; msg: RpcMessage; header: unknown }[] = [];
  let lines = 0;
  const pass = (m: RpcMessage) => {
    const key =
      m.method === "tools/call"
        ? String(m.params?.name ?? "tools/call")
        : String(m.method ?? "unknown");
    passedThrough[key] = (passedThrough[key] ?? 0) + 1;
  };

  log.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim()) return;
    lines++;
    let entry: unknown;
    try {
      entry = JSON.parse(raw);
    } catch {
      unreadable.push({ line, reason: "Not JSON." });
      return;
    }
    if (!isObject(entry)) return void unreadable.push({ line, reason: "Not a JSON object." });
    const at = typeof entry.at === "string" ? new Date(entry.at) : null;
    if (!at || Number.isNaN(at.getTime()))
      return void unreadable.push({
        line,
        reason:
          'No time in "at" (an ISO 8601 timestamp); limits depend on it, so it is not guessed.',
      });
    const request = entry.request;
    const header = isObject(entry.headers) ? entry.headers["x-ainra-passport"] : undefined;
    if (Array.isArray(request)) {
      const guarded = request.some(
        (m) =>
          isObject(m) &&
          m.method === "tools/call" &&
          rules.has(String((m as RpcMessage).params?.name)),
      );
      if (guarded)
        return void unreadable.push({
          line,
          reason:
            "A batch with money-moving calls: the proxy refuses these whole (send them one at a time), so Gate never decides them.",
        });
      for (const m of request) pass(isObject(m) ? (m as RpcMessage) : {});
      return;
    }
    if (!isObject(request) || typeof request.method !== "string")
      return void unreadable.push({ line, reason: 'No JSON-RPC message in "request".' });
    calls.push({ line, at, msg: request as RpcMessage, header });
  });

  // Limits count by time, so replay in time order (ties keep the log's order).
  calls.sort((a, b) => a.at.getTime() - b.at.getTime() || a.line - b.line);
  const usage = memoryUsage();
  const decided: ShadowDecision[] = [];
  for (const c of calls) {
    const name = c.msg.method === "tools/call" ? String(c.msg.params?.name ?? "") : "";
    const rule = rules.get(name);
    if (!rule) {
      pass(c.msg);
      continue;
    }
    const args = isObject(c.msg.params?.arguments) ? c.msg.params.arguments : {};
    const passport = c.msg.params?._meta?.["ainra/passport"] ?? c.header ?? undefined;
    decided.push({
      line: c.line,
      at: c.at.toISOString(),
      ...decideToolCall(config.policy, rule, {
        args,
        passport,
        at: c.at,
        usage,
        passportNow: passportClock(c.at),
      }),
    });
  }

  return {
    lines,
    decided,
    passedThrough,
    unreadable,
    from: calls[0]?.at.toISOString() ?? null,
    to: calls.at(-1)?.at.toISOString() ?? null,
  };
}

/** One line of the decisions file: the proxy's decisions-log format, plus the log line it came from. */
export function shadowLine(d: ShadowDecision): string {
  return JSON.stringify({
    line: d.line,
    at: d.at,
    tool: d.tool,
    agent: d.agentId,
    action: d.action,
    decision: d.decision.decision,
    summary: d.decision.summary,
    ...(d.unreadable ? { unreadable: d.unreadable } : {}),
    requestHash: d.decision.evidence.requestHash,
    decisionHash: d.decision.evidence.decisionHash,
  });
}

const OUTCOMES: GateOutcome[] = ["allow", "review", "block"];
const LABEL: Record<GateOutcome, string> = {
  allow: "Allowed on its own",
  review: "Sent to a person",
  block: "Blocked",
};

type Tally = Record<GateOutcome, number>;
const zero = (): Tally => ({ allow: 0, review: 0, block: 0 });
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "0%");
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

function tallyBy(decided: ShadowDecision[], key: (d: ShadowDecision) => string) {
  const m = new Map<string, Tally>();
  for (const d of decided) {
    const t = m.get(key(d)) ?? zero();
    t[d.decision.decision]++;
    m.set(key(d), t);
  }
  return [...m.entries()].sort(
    (a, b) => OUTCOMES.reduce((n, o) => n + b[1][o], 0) - OUTCOMES.reduce((n, o) => n + a[1][o], 0),
  );
}

/** The report a compliance team reads: what Gate would have done, why, and what it couldn't read. */
export function shadowReport(result: ShadowResult, opts: { title?: string } = {}): string {
  const { decided, unreadable } = result;
  const totals = zero();
  const cents = zero();
  for (const d of decided) {
    totals[d.decision.decision]++;
    cents[d.decision.decision] += d.action?.amountCents ?? 0;
  }
  const passed = Object.values(result.passedThrough).reduce((n, v) => n + v, 0);
  const out: string[] = [];
  out.push(`# ${opts.title ?? "Gate shadow replay"}`, "");
  out.push(
    "What MyLiquid Gate would have done with these agent calls if it had been enforcing this policy. It ran out of",
    "band on a copy of the log: nothing was forwarded, blocked or sent anywhere.",
    "",
  );
  out.push(
    `- Log lines read: **${result.lines}**${result.from ? ` (calls from ${result.from} to ${result.to})` : ""}`,
    `- Money-moving calls decided: **${decided.length}**`,
    `- Other calls (passed straight through, not money-moving): **${passed}**`,
    `- Lines Gate could not read: **${unreadable.length}**${unreadable.length ? " (listed below, never guessed)" : ""}`,
    "",
  );

  out.push(
    "## Decisions",
    "",
    "| decision | calls | share | amount |",
    "| --- | ---: | ---: | ---: |",
  );
  for (const o of OUTCOMES)
    out.push(
      `| ${LABEL[o]} | ${totals[o]} | ${pct(totals[o], decided.length)} | ${formatUsd(cents[o])} |`,
    );
  out.push("");

  const table = (title: string, rows: [string, Tally][]) => {
    if (!rows.length) return;
    out.push(
      `## ${title}`,
      "",
      "| | allowed | to a person | blocked |",
      "| --- | ---: | ---: | ---: |",
    );
    for (const [k, t] of rows) out.push(`| ${cell(k)} | ${t.allow} | ${t.review} | ${t.block} |`);
    out.push("");
  };
  table(
    "By tool",
    tallyBy(decided, (d) => d.tool),
  );
  table(
    "By agent",
    tallyBy(decided, (d) =>
      d.agentId === "unidentified" ? "Unidentified (no verified passport)" : d.agentId,
    ),
  );

  const reasons = new Map<string, { label: string; status: string; n: number; example: string }>();
  for (const d of decided) {
    // A call whose action couldn't be read is blocked for that one reason; its other checks ran on nothing.
    if (d.unreadable) {
      const r = reasons.get("unreadable") ?? {
        label: "Action not readable",
        status: "block",
        n: 0,
        example: d.unreadable,
      };
      r.n++;
      reasons.set("unreadable", r);
      continue;
    }
    for (const c of d.decision.checks.filter((c) => c.status !== "pass")) {
      const r = reasons.get(c.id) ?? { label: c.label, status: c.status, n: 0, example: c.detail };
      r.n++;
      reasons.set(c.id, r);
    }
  }
  const top = [...reasons.values()].sort((a, b) => b.n - a.n).slice(0, 10);
  if (top.length) {
    out.push(
      "## Why calls were held or blocked",
      "",
      "A call can fail more than one check.",
      "",
      "| check | outcome | calls | example |",
      "| --- | --- | ---: | --- |",
    );
    for (const r of top)
      out.push(
        `| ${r.label} | ${r.status === "block" ? "blocked" : "to a person"} | ${r.n} | ${cell(r.example)} |`,
      );
    out.push("");
  }

  const blind = decided.filter((d) => d.unreadable);
  if (unreadable.length || blind.length) {
    out.push("## What Gate could not read", "");
    if (blind.length) {
      out.push(
        "Money-moving calls whose amount or action could not be read from the arguments. Gate blocks these (fail",
        "closed); fix the tool mapping in the config if the field is named differently.",
        "",
      );
      for (const d of blind) out.push(`- Line ${d.line}, \`${d.tool}\`: ${d.unreadable}`);
      out.push("");
    }
    if (unreadable.length) {
      out.push("Lines that were not decided at all:", "");
      for (const u of unreadable) out.push(`- Line ${u.line}: ${u.reason}`);
      out.push("");
    }
  }

  out.push(
    "## How to read this",
    "",
    "- Usage is counted as if Gate had been enforcing: only allowed calls use up the daily limit and the hourly rate.",
    "- Agents count as identified only with an AINRA passport that verifies; what an agent says about itself never counts.",
    "- Every decision in `decisions.jsonl` carries its evidence hashes (`requestHash`, `decisionHash`).",
    "",
  );
  return out.join("\n");
}
