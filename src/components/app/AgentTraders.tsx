"use client";

import clsx from "clsx";
import {
  BadgeCheck,
  Bot,
  CircleAlert,
  CircleCheck,
  CircleX,
  Fingerprint,
  Loader2,
  Pencil,
  Play,
  Send,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson, useAction } from "@/components/client";
import { formatUsd } from "@/components/format";
import { Badge, EmptyState, buttonClass } from "@/components/ui";
import { Snippet } from "./KeyManager";

const inputClass =
  "h-9 rounded-lg border border-line-strong bg-surface-2 px-2.5 text-sm text-fg outline-none focus:border-accent";

const utcTime = (unix: number) => new Date(unix * 1000).toISOString().slice(11, 16);

// ── Invite ──────────────────────────────────────────────────────────────────

export interface InviteSummary {
  id: string;
  label: string;
  scopes: string[];
  tradeMode: "propose" | "auto";
  perTradeLimitCents: number;
  dailyLimitCents: number;
  expiresAt: number;
}

/** The investor invites an outside agent trader; it connects itself with its AINRA passport. */
export function InviteAgent({ origin, open }: { origin: string; open: InviteSummary[] }) {
  const { run, pending, error } = useAction();
  const [label, setLabel] = useState("Agent trader");
  const [allowTrade, setAllowTrade] = useState(true);
  const [allowPay, setAllowPay] = useState(false);
  const [auto, setAuto] = useState(true);
  const [perTrade, setPerTrade] = useState("1000");
  const [daily, setDaily] = useState("5000");
  const [code, setCode] = useState<{ code: string; expiresAt: number } | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await run(() =>
      postJson<{ code: string; invite: { expiresAt: number } }>("/api/agent-invites", {
        label,
        allowTrade,
        allowPay,
        tradeMode: allowTrade && auto ? "auto" : "propose",
        perTradeLimitUsd: Number(perTrade) || 0,
        dailyLimitUsd: Number(daily) || 0,
      }),
    );
    if (res) setCode({ code: res.code, expiresAt: res.invite.expiresAt });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="space-y-3">
        <label className="block text-xs text-fg-2">
          Name it
          <input
            className={clsx(inputClass, "mt-1 w-full")}
            value={label}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
            aria-label="Invite name"
          />
        </label>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowTrade}
              onChange={() => setAllowTrade(!allowTrade)}
              className="accent-[var(--accent)]"
            />
            May trade
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowPay}
              onChange={() => setAllowPay(!allowPay)}
              className="accent-[var(--accent)]"
            />
            May pay (agent card)
          </label>
        </div>
        {allowTrade && (
          <fieldset className="space-y-2 rounded-xl border border-line p-3">
            <legend className="px-1 text-xs text-fg-2">Its trades</legend>
            <label className="flex items-start gap-2 text-sm text-fg">
              <input
                type="radio"
                name="mode"
                checked={!auto}
                onChange={() => setAuto(false)}
                className="mt-1 accent-[var(--accent)]"
              />
              <span>
                Propose: you approve each one
                <span className="block text-xs text-muted">Any agent can do this.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-fg">
              <input
                type="radio"
                name="mode"
                checked={auto}
                onChange={() => setAuto(true)}
                className="mt-1 accent-[var(--accent)]"
              />
              <span>
                Trade on its own, within limits
                <span className="block text-xs text-muted">
                  Only while it proves who it is with a fresh AINRA passport, at tier L2 or higher,
                  declaring myliquid:trade.
                </span>
              </span>
            </label>
            {auto && (
              <div className="flex flex-wrap gap-3 pl-6">
                <label className="text-xs text-fg-2">
                  Per trade ($)
                  <input
                    className={clsx(inputClass, "mt-1 block w-28")}
                    inputMode="decimal"
                    value={perTrade}
                    onChange={(e) => setPerTrade(e.target.value)}
                    aria-label="Per-trade limit in dollars"
                  />
                </label>
                <label className="text-xs text-fg-2">
                  Per day ($)
                  <input
                    className={clsx(inputClass, "mt-1 block w-28")}
                    inputMode="decimal"
                    value={daily}
                    onChange={(e) => setDaily(e.target.value)}
                    aria-label="Daily limit in dollars"
                  />
                </label>
              </div>
            )}
          </fieldset>
        )}
        <button className={buttonClass("primary")} disabled={pending || !label.trim()}>
          <Send className="h-4 w-4" /> Create invite
        </button>
        {error && <p className="text-xs text-critical">{error}</p>}
      </form>

      {code && (
        <div className="space-y-3 rounded-xl border border-accent/40 bg-accent/5 p-3">
          <p className="text-xs text-fg">
            Give this to your agent. It works once, until {utcTime(code.expiresAt)} UTC, and is
            shown only now.
          </p>
          <Snippet label="Invite code" code={code.code} />
          <Snippet
            label="The agent connects itself with its AINRA passport"
            code={`curl -s ${origin}/api/agent-identity/enroll \\\n  -H "Content-Type: application/json" \\\n  -d '{"invite": "${code.code}", "ainra_passport": <its bundle JSON or base64url>}'`}
          />
          <p className="text-[11px] text-fg-2">
            It gets back an API key already pinned to its AINRA Number, the MCP endpoint, and five
            minutes before it must present its passport again at <code>/api/agent-identity</code>.
          </p>
        </div>
      )}

      {open.length > 0 && (
        <div>
          <div className="mb-1 text-xs text-fg-2">Open invites</div>
          <ul className="space-y-1">
            {open.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs"
              >
                <span className="font-medium text-fg">{i.label}</span>
                <span className="text-muted">
                  {i.scopes.join(" + ")} ·{" "}
                  {i.tradeMode === "auto"
                    ? `on its own up to ${formatUsd(i.perTradeLimitCents)} / ${formatUsd(i.dailyLimitCents)} a day`
                    : "proposes"}{" "}
                  · until {utcTime(i.expiresAt)} UTC
                </span>
                <button
                  className={clsx(buttonClass("ghost", "sm"), "ml-auto")}
                  disabled={pending}
                  onClick={() =>
                    run(() => postJson(`/api/agent-invites/${i.id}`, undefined, "DELETE"))
                  }
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Connected agents ────────────────────────────────────────────────────────

export interface ConnectionView {
  keyId: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  scopes: string[];
  identified: boolean;
  identity: {
    ainraNumber: string;
    tier: string | null;
    capabilities: string[];
    requirePassport: boolean;
    verifiedUntil: number | null;
    lastStatus: "valid" | "invalid" | null;
    lastReason: string | null;
    tradeMode: "propose" | "auto";
    perTradeLimitCents: number;
    dailyLimitCents: number;
  } | null;
  tierCeilingCents: number;
  effectivePerTradeLimitCents: number;
  usedTodayCents: number;
  autonomyBlockedBy: string | null;
}

function StatusBadge({ c }: { c: ConnectionView }) {
  const id = c.identity;
  if (!id) return <Badge tone="warning">not identified</Badge>;
  if (c.identified)
    return <Badge tone="good">identified until {utcTime(id.verifiedUntil!)} UTC</Badge>;
  if (id.lastStatus === "invalid") return <Badge tone="critical">blocked: {id.lastReason}</Badge>;
  return id.requirePassport ? (
    <Badge tone="warning">waiting for a fresh passport</Badge>
  ) : (
    <Badge>passport not required</Badge>
  );
}

function TradingLine({ c, onEdit }: { c: ConnectionView; onEdit: () => void }) {
  const id = c.identity;
  const auto = id?.tradeMode === "auto" && !c.autonomyBlockedBy;
  const cutOff = !!id?.requirePassport && id.lastStatus === "invalid";
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {cutOff ? (
        <span className="text-critical">
          Cut off: MyLiquid refuses its key until it presents a valid passport.
        </span>
      ) : auto ? (
        <span className="text-fg">
          Trades on its own up to <b>{formatUsd(c.effectivePerTradeLimitCents)}</b> a trade
          {c.tierCeilingCents < (id?.perTradeLimitCents ?? 0) && (
            <span className="text-muted"> (its {id?.tier} ceiling)</span>
          )}{" "}
          and <b>{formatUsd(id!.dailyLimitCents)}</b> a day ·{" "}
          <span className="text-fg-2">{formatUsd(c.usedTodayCents)} used today</span>
        </span>
      ) : (
        <span className="text-fg-2">
          Proposes; you approve each trade.
          {c.autonomyBlockedBy && <span className="text-muted"> {c.autonomyBlockedBy}</span>}
        </span>
      )}
      {id && (
        <button className={clsx(buttonClass("ghost", "sm"), "ml-auto")} onClick={onEdit}>
          <Pencil className="h-3 w-3" /> Limits
        </button>
      )}
    </div>
  );
}

function LimitsEditor({ c, onDone }: { c: ConnectionView; onDone: () => void }) {
  const { run, pending, error } = useAction();
  const id = c.identity!;
  const [auto, setAuto] = useState(id.tradeMode === "auto");
  const [perTrade, setPerTrade] = useState(String((id.perTradeLimitCents || 100_000) / 100));
  const [daily, setDaily] = useState(String((id.dailyLimitCents || 500_000) / 100));
  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg bg-surface-2 p-3 text-xs"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await run(() =>
          postJson(
            `/api/keys/${c.keyId}/identity`,
            {
              trading: {
                mode: auto ? "auto" : "propose",
                perTradeLimitUsd: Number(perTrade) || 0,
                dailyLimitUsd: Number(daily) || 0,
              },
            },
            "PATCH",
          ),
        );
        if (res) onDone();
      }}
    >
      <label className="flex items-center gap-2 text-fg">
        <input
          type="checkbox"
          checked={auto}
          onChange={() => setAuto(!auto)}
          className="accent-[var(--accent)]"
        />
        Trade on its own
      </label>
      {auto && (
        <>
          <label className="text-fg-2">
            Per trade ($)
            <input
              className={clsx(inputClass, "mt-1 block w-24")}
              value={perTrade}
              onChange={(e) => setPerTrade(e.target.value)}
              aria-label={`Per-trade limit for ${c.name}`}
            />
          </label>
          <label className="text-fg-2">
            Per day ($)
            <input
              className={clsx(inputClass, "mt-1 block w-24")}
              value={daily}
              onChange={(e) => setDaily(e.target.value)}
              aria-label={`Daily limit for ${c.name}`}
            />
          </label>
        </>
      )}
      <button className={buttonClass("primary", "sm")} disabled={pending}>
        Save
      </button>
      <button type="button" className={buttonClass("ghost", "sm")} onClick={onDone}>
        Cancel
      </button>
      {error && <p className="w-full text-critical">{error}</p>}
    </form>
  );
}

/** Every agent connected to the account: who it is by AINRA, whether it's identified now, and what it may do. */
export function ConnectedAgents({ connections }: { connections: ConnectionView[] }) {
  const { run, pending } = useAction();
  const [editing, setEditing] = useState<string | null>(null);
  if (connections.length === 0)
    return (
      <EmptyState>
        No agents connected yet. Invite one, or take a testbed agent for a test drive.
      </EmptyState>
    );
  return (
    <ul className="space-y-3">
      {connections.map((c) => (
        <li key={c.keyId} className="space-y-2 rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            {c.identity ? (
              <Fingerprint className="h-4 w-4 text-accent" aria-hidden />
            ) : (
              <Bot className="h-4 w-4 text-muted" aria-hidden />
            )}
            <span className="text-sm font-medium text-fg">{c.name}</span>
            {c.identity?.tier && <Badge tone="accent">AINRA {c.identity.tier}</Badge>}
            <StatusBadge c={c} />
            <Badge>{c.scopes.join(" + ") || "no access"}</Badge>
            <button
              className={clsx(buttonClass("ghost", "sm"), "ml-auto")}
              disabled={pending}
              onClick={() => run(() => postJson(`/api/keys/${c.keyId}`, undefined, "DELETE"))}
            >
              <Trash2 className="h-3.5 w-3.5" /> Disconnect
            </button>
          </div>
          {c.identity && (
            <div className="break-all font-mono text-[11px] text-fg-2">
              {c.identity.ainraNumber}
              {c.identity.capabilities.length > 0 && (
                <span className="text-muted"> · {c.identity.capabilities.join(", ")}</span>
              )}
            </div>
          )}
          {editing === c.keyId ? (
            <LimitsEditor c={c} onDone={() => setEditing(null)} />
          ) : (
            <TradingLine c={c} onEdit={() => setEditing(c.keyId)} />
          )}
          <div className="font-mono text-[10px] text-muted">
            key {c.prefix}… ·{" "}
            {c.lastUsedAt
              ? `last call ${c.lastUsedAt.slice(0, 16).replace("T", " ")}`
              : "no calls yet"}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Test drive ──────────────────────────────────────────────────────────────

type StepTone = "ok" | "warn" | "fail" | "running";

interface Step {
  title: string;
  detail: string;
  tone: StepTone;
}

interface TestbedAgentView {
  id: string;
  label: string;
  summary: string;
}

const TEST_DRIVE_PREFIX = "Test drive · ";

async function readJson(res: Response): Promise<Record<string, unknown>> {
  return ((await res.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
}

/** One MCP tools/call over HTTP, exactly as an outside agent makes it. */
async function callTool(key: string, name: string, args: Record<string, unknown> = {}) {
  const res = await fetch("/api/mcp", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-06-18",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const body = (await readJson(res)) as {
    result?: { content?: { text?: string }[]; isError?: boolean };
    error?: { message?: string };
  };
  if (!res.ok || !body.result)
    return {
      status: res.status,
      ok: false,
      data: { error: body.error?.message ?? res.statusText },
    };
  const text = body.result.content?.[0]?.text ?? "";
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { error: text };
  }
  return { status: res.status, ok: !body.result.isError, data };
}

const TRADE = {
  productId: "MLUS",
  side: "buy",
  rationale: "Test drive: US index momentum is positive and the position is small.",
};

/**
 * Runs a testbed AINRA agent against this deployment's real endpoints, from the browser: the investor invites
 * it, it enrolls with its passport, reads, and trades; the yield hunter is then revoked by its registrar.
 */
export function TraderTestDrive({
  agents,
  previous,
}: {
  agents: TestbedAgentView[];
  /** Earlier test-drive connections, replaced when the same agent drives again. */
  previous: { keyId: string; name: string }[];
}) {
  const router = useRouter();
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const agent = agents.find((a) => a.id === agentId);

  async function drive() {
    if (!agent) return;
    setRunning(true);
    const log: Step[] = [];
    const show = () => setSteps([...log]);
    const step = (title: string, detail: string, tone: StepTone) => {
      log.push({ title, detail, tone });
      show();
    };
    try {
      const name = `${TEST_DRIVE_PREFIX}${agent.label}`;
      for (const p of previous.filter((p) => p.name === name))
        await fetch(`/api/keys/${p.keyId}`, { method: "DELETE" });

      // 1. The investor invites it.
      const invRes = await fetch("/api/agent-invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: agent.label,
          allowTrade: true,
          allowPay: agent.id === "treasury-agent",
          tradeMode: "auto",
          perTradeLimitUsd: 1000,
          dailyLimitUsd: 2500,
        }),
      });
      const inv = await readJson(invRes);
      if (!invRes.ok) throw new Error(String(inv.error ?? "Could not create the invite"));
      step(
        "You invite it",
        "May trade on its own up to $1,000 a trade and $2,500 a day, if its identity allows. One-time code, 15 minutes.",
        "ok",
      );

      // 2. It brings its passport.
      const passport = await fetch(`/api/ainra/testbed?agent=${agent.id}`).then((r) => r.json());
      step(
        "It brings its AINRA passport",
        `${agent.label}: ${agent.summary}. ${Math.round(JSON.stringify(passport).length / 1024)} KB, signed with Ed25519 and ML-DSA-65.`,
        "ok",
      );

      // 3. It enrolls.
      const enrollRes = await fetch("/api/agent-identity/enroll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invite: inv.code, ainra_passport: passport, name }),
      });
      const enrolled = (await readJson(enrollRes)) as {
        api_key?: string;
        identity?: { number: string; tier: string };
        scopes?: string[];
        trading?: { mode: string; per_trade_limit?: string; daily_limit?: string };
        error?: string;
        reason?: string;
      };
      if (!enrollRes.ok || !enrolled.api_key) {
        step("MyLiquid refuses it", `${enrolled.reason ?? ""} ${enrolled.error ?? ""}`, "fail");
        return;
      }
      const key = enrolled.api_key;
      const tradesAlone = enrolled.trading?.mode === "auto";
      step(
        "MyLiquid verifies it and connects it",
        `${enrolled.identity?.number} · ${enrolled.identity?.tier} · ${enrolled.scopes?.join(" + ")} · ${
          tradesAlone
            ? `trades on its own up to ${enrolled.trading?.per_trade_limit} a trade, ${enrolled.trading?.daily_limit} a day`
            : "proposes only"
        }. Verified locally with @ainra/sdk; its key is pinned to that AINRA Number.`,
        "ok",
      );

      // 4. It reads.
      const portfolio = await callTool(key, "get_portfolio");
      step(
        "It reads your portfolio over MCP",
        portfolio.ok
          ? `Total ${String(portfolio.data.total)}, cash ${String(portfolio.data.availableCash)}. Every call is logged with its AINRA Number.`
          : String(portfolio.data.error),
        portfolio.ok ? "ok" : "fail",
      );

      // 5. It trades.
      if (!enrolled.scopes?.includes("trade")) {
        const tried = await callTool(key, "propose_trade", { ...TRADE, amountUsd: 500 });
        step(
          "It tries to buy $500 of MLUS",
          tried.ok
            ? "Unexpectedly allowed."
            : `Refused: trading isn't among its tools. AINRA tier ${enrolled.identity?.tier} only reads.`,
          tried.ok ? "fail" : "ok",
        );
      } else {
        const small = await callTool(key, "propose_trade", { ...TRADE, amountUsd: 500 });
        const outcome = String(small.data.outcome ?? small.data.error);
        step(
          "It buys $500 of MLUS",
          outcome === "executed"
            ? `Executed on its own: order ${String(small.data.orderId)}, stamped with its AINRA Number.`
            : outcome === "proposed"
              ? `Became a proposal for you: ${String(small.data.whyNotAutomatic)}`
              : `Blocked: ${JSON.stringify(small.data.checks ?? small.data.error)}`,
          outcome === "executed" ? "ok" : "warn",
        );
        const big = await callTool(key, "propose_trade", { ...TRADE, amountUsd: 1500 });
        step(
          "It tries $1,500, above its limit",
          big.data.outcome === "proposed"
            ? `Became a proposal waiting for your approval: ${String(big.data.whyNotAutomatic)}`
            : `Outcome: ${String(big.data.outcome ?? big.data.error)}`,
          big.data.outcome === "proposed" ? "ok" : "warn",
        );
      }

      // 6. The yield hunter's registrar revokes it.
      if (agent.id === "yield-hunter") {
        const revoked = await fetch(`/api/ainra/testbed?agent=${agent.id}&revoked=1`).then((r) =>
          r.json(),
        );
        const present = await fetch("/api/agent-identity", {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify({ ainra_passport: revoked }),
        });
        const verdict = await readJson(present);
        step(
          "Its registrar revokes it; its next passport says so",
          present.status === 403
            ? `Refused (${String(verdict.reason)}). Its pending proposals are withdrawn and Sentinel raises an alert.`
            : `Unexpected: ${present.status}`,
          present.status === 403 ? "ok" : "fail",
        );
        const after = await callTool(key, "get_portfolio");
        step(
          "It tries again",
          after.status === 403
            ? "Cut off: every request with its key is refused until a valid passport is presented."
            : `Unexpected: ${after.status}`,
          after.status === 403 ? "ok" : "fail",
        );
      }
    } catch (err) {
      step("The test drive stopped", err instanceof Error ? err.message : String(err), "fail");
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="w-full min-w-0 text-xs text-fg-2 sm:w-auto">
          Testbed agent
          <select
            className={clsx(inputClass, "mt-1 block w-full sm:w-80")}
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            aria-label="Testbed agent"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} ({a.summary.split(" · ")[0]})
              </option>
            ))}
          </select>
        </label>
        <button className={buttonClass("primary")} disabled={running || !agent} onClick={drive}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{" "}
          Run the test drive
        </button>
      </div>
      {agent && <p className="text-xs text-muted">{agent.summary}.</p>}
      {steps.length > 0 && (
        <ol className="space-y-2" aria-label="Test drive steps">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-line bg-surface-2/60 p-3">
              {s.tone === "ok" ? (
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-good" aria-label="done" />
              ) : s.tone === "warn" ? (
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-label="note" />
              ) : s.tone === "fail" ? (
                <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-critical" aria-label="refused" />
              ) : (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden />
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium text-fg">
                  {i + 1}. {s.title}
                </div>
                <div className="break-words text-xs text-fg-2">{s.detail}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {!running && steps.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-fg-2">
          <BadgeCheck className="h-3.5 w-3.5 text-good" aria-hidden /> The agent now appears under
          Connected agents, its trades on Home and in Activity.
        </p>
      )}
    </div>
  );
}
