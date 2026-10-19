import { toIsoDate } from "@/lib/domain/dates";
import { decide, type GateAction, type GateDecision, type GatePolicy } from "./engine";
import { identityFromPassport } from "./identity";

/**
 * MyLiquid Gate as an MCP guardrail proxy: it stands in front of any MCP server (a broker's, Alpaca's, MyLiquid's
 * own) and sends every money-moving tool call through Gate first. Everything else passes through untouched.
 *
 * - The firm lists which tools move money and how to read the action from their arguments (`ToolRule`).
 * - The agent identifies itself with its AINRA presentation, in the call's `_meta["ainra/passport"]` (a passport
 *   is ~36 KB, too big for most header limits) or the `x-ainra-passport` header. Identity comes only from that
 *   verified passport, never from what the agent says.
 * - `allow` forwards the call, with the decision's evidence added to the result's `_meta`; `review` and `block`
 *   never reach the upstream server: the agent gets a tool error saying why, and the firm's hooks are called.
 *
 * Runtime-agnostic (Web Request/Response, fetch injected); `scripts/gate-proxy.ts` runs it as a server.
 */

type Field = { field: string };

export interface ToolRule {
  /** The upstream tool's name. */
  tool: string;
  kind: GateAction["kind"];
  /** Where the amount is, and in what unit. */
  amount: Field & { unit: "cents" | "dollars" };
  side?: Field | { fixed: "buy" | "sell" };
  instrument?: Field;
  merchant?: Field;
  category?: Field;
}

export interface ProxyConfig {
  /** The MCP endpoint calls are forwarded to. */
  upstream: string;
  policy: GatePolicy;
  tools: ToolRule[];
}

export interface ProxyCall {
  tool: string;
  agentId: string;
  action: GateAction | null;
  decision: GateDecision;
}

export interface ProxyOptions {
  fetch?: typeof fetch;
  now?: () => Date;
  /** Every decision, for the firm's records (the evidence hashes are in it). */
  onDecision?: (call: ProxyCall) => void | Promise<void>;
  /** Calls that need a person: hand them to the firm's approval flow. */
  onReview?: (call: ProxyCall) => void | Promise<void>;
  /** Today's usage per agent; in memory by default (one process). */
  usage?: UsageStore;
}

export interface UsageStore {
  /** What this agent did on its own today (cents) and how many actions it took in the last hour. */
  get(agentId: string, at: Date): { usedTodayCents: number; actionsLastHour: number };
  add(agentId: string, at: Date, cents: number): void;
}

/** Usage kept in this process's memory (one proxy instance). */
export function memoryUsage(): UsageStore {
  const m = new Map<string, { at: number; cents: number }[]>();
  return {
    get: (agentId, at) => {
      const day = toIsoDate(at);
      const list = (m.get(agentId) ?? []).filter((e) => at.getTime() - e.at < 25 * 3_600_000);
      m.set(agentId, list);
      return {
        usedTodayCents: list
          .filter((e) => toIsoDate(new Date(e.at)) === day)
          .reduce((n, e) => n + e.cents, 0),
        actionsLastHour: list.filter((e) => at.getTime() - e.at < 3_600_000).length,
      };
    },
    add: (agentId, at, cents) => {
      m.set(agentId, [...(m.get(agentId) ?? []), { at: at.getTime(), cents }]);
    },
  };
}

const FORWARD_HEADERS = [
  "authorization",
  "content-type",
  "accept",
  "mcp-session-id",
  "mcp-protocol-version",
];

interface RpcCall {
  jsonrpc: "2.0";
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: Record<string, unknown>; _meta?: Record<string, unknown> };
}

function read(args: Record<string, unknown>, f: Field | undefined): unknown {
  return f
    ? f.field.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], args)
    : undefined;
}

/** The Gate action a tool call asks for, or an error saying what's missing. */
export function actionFromCall(
  rule: ToolRule,
  args: Record<string, unknown>,
): { action: GateAction } | { error: string } {
  const raw = Number(read(args, rule.amount));
  if (!Number.isFinite(raw)) return { error: `No amount in "${rule.amount.field}".` };
  const amountCents = rule.amount.unit === "dollars" ? Math.round(raw * 100) : Math.round(raw);
  const str = (f?: Field) => {
    const v = read(args, f);
    return typeof v === "string" ? v : undefined;
  };
  const side =
    rule.side && "fixed" in rule.side ? rule.side.fixed : str(rule.side as Field | undefined);
  return {
    action: {
      kind: rule.kind,
      amountCents,
      ...(rule.kind === "trade"
        ? { side: side === "sell" ? "sell" : "buy", instrument: str(rule.instrument) }
        : { merchant: str(rule.merchant), category: str(rule.category) }),
    },
  };
}

const rpcResult = (id: RpcCall["id"], result: unknown) =>
  Response.json({ jsonrpc: "2.0", id: id ?? null, result });

/** The tool error an agent gets instead of the call, with Gate's reasons. */
function refusal(id: RpcCall["id"], decision: GateDecision): Response {
  const reasons = decision.checks
    .filter((c) => c.status !== "pass")
    .map((c) => `- ${c.label}: ${c.detail}`);
  const text = [
    decision.decision === "review"
      ? "Not done: this needs a person's approval first. It has been sent for review."
      : "Not done: MyLiquid Gate blocked it.",
    decision.summary,
    ...reasons,
  ].join("\n");
  return rpcResult(id, {
    content: [{ type: "text", text }],
    isError: true,
    _meta: { "myliquid/gate": gateMeta(decision) },
  });
}

const gateMeta = (d: GateDecision) => ({
  decision: d.decision,
  summary: d.summary,
  requestHash: d.evidence.requestHash,
  decisionHash: d.evidence.decisionHash,
  decidedAt: d.evidence.decidedAt,
});

export function createGateProxy(config: ProxyConfig, opts: ProxyOptions = {}) {
  const doFetch = opts.fetch ?? fetch;
  const now = opts.now ?? (() => new Date());
  const usage = opts.usage ?? memoryUsage();
  const rules = new Map(config.tools.map((r) => [r.tool, r]));

  async function forward(req: Request, body: string): Promise<Response> {
    const headers = new Headers();
    for (const h of FORWARD_HEADERS) {
      const v = req.headers.get(h);
      if (v) headers.set(h, v);
    }
    const res = await doFetch(config.upstream, {
      method: req.method,
      headers,
      body: body || undefined,
    });
    // Pass the upstream response through as it is (JSON or an event stream).
    const out = new Headers();
    for (const h of ["content-type", "mcp-session-id"]) {
      const v = res.headers.get(h);
      if (v) out.set(h, v);
    }
    return new Response(res.body, { status: res.status, headers: out });
  }

  return async function handle(req: Request): Promise<Response> {
    if (req.method !== "POST") return forward(req, "");
    const text = await req.text();
    let msg: RpcCall | RpcCall[];
    try {
      msg = JSON.parse(text);
    } catch {
      return forward(req, text);
    }
    const calls = Array.isArray(msg) ? msg : [msg];
    const guarded = calls.filter(
      (c) => c.method === "tools/call" && rules.has(c.params?.name ?? ""),
    );
    if (guarded.length === 0) return forward(req, text);
    if (Array.isArray(msg))
      return Response.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32600, message: "Send money-moving tool calls one at a time." },
        },
        { status: 400 },
      );

    const call = guarded[0]!;
    const rule = rules.get(call.params!.name!)!;
    const args = call.params?.arguments ?? {};
    const passport =
      call.params?._meta?.["ainra/passport"] ?? req.headers.get("x-ainra-passport") ?? undefined;
    const identity = identityFromPassport(passport ?? undefined);
    const agentId = identity.verified && identity.number ? identity.number : "unidentified";
    const at = now();
    const used = usage.get(agentId, at);
    const parsed = actionFromCall(rule, args);
    const action: GateAction =
      "action" in parsed ? parsed.action : { kind: rule.kind, amountCents: 0 };
    const decision = decide(
      {
        action,
        agent: { id: agentId, identity },
        policy: config.policy,
        usage: used,
      },
      { now: at },
    );
    const record: ProxyCall = {
      tool: rule.tool,
      agentId,
      action: "action" in parsed ? action : null,
      decision,
    };
    await opts.onDecision?.(record);
    if (decision.decision !== "allow") {
      if (decision.decision === "review") await opts.onReview?.(record);
      return refusal(call.id, decision);
    }

    usage.add(agentId, at, action.amountCents);
    // Forward without the passport (tens of KB the upstream doesn't need).
    const { _meta, ...params } = call.params ?? {};
    const rest = Object.fromEntries(
      Object.entries(_meta ?? {}).filter(([k]) => k !== "ainra/passport"),
    );
    const res = await forward(
      req,
      JSON.stringify({
        ...call,
        params: Object.keys(rest).length ? { ...params, _meta: rest } : params,
      }),
    );
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return res;
    const body = (await res.json().catch(() => null)) as {
      result?: Record<string, unknown>;
    } | null;
    if (!body?.result) return Response.json(body, { status: res.status });
    const meta = (body.result._meta as Record<string, unknown> | undefined) ?? {};
    return Response.json(
      {
        ...body,
        result: { ...body.result, _meta: { ...meta, "myliquid/gate": gateMeta(decision) } },
      },
      {
        status: res.status,
        headers: res.headers.get("mcp-session-id")
          ? { "mcp-session-id": res.headers.get("mcp-session-id")! }
          : {},
      },
    );
  };
}
