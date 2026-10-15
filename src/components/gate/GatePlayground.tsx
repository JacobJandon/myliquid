"use client";

import clsx from "clsx";
import { Check, Loader2, OctagonX, UserCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge, buttonClass, type Tone } from "@/components/ui";

/** Try MyLiquid Gate: pick an agent, an action and a policy, and see what Gate decides and why. */

const AGENTS = [
  { id: "momentum-trader", label: "Northwind Momentum Trader · AINRA L2, may trade" },
  { id: "treasury-agent", label: "Harbor Treasury Agent · AINRA L3, may trade and pay" },
  { id: "research-analyst", label: "Northwind Research Analyst · AINRA L1, read only" },
  { id: "yield-hunter-revoked", label: "QuickFox Yield Hunter · passport revoked" },
  { id: "none", label: "An agent with no passport" },
] as const;

interface Check {
  id: string;
  label: string;
  status: "pass" | "review" | "block";
  detail: string;
}
interface Result {
  decision: "allow" | "review" | "block";
  summary: string;
  checks: Check[];
  evidence: { decidedAt: string; requestHash: string; decisionHash: string };
  identity: {
    verified: boolean;
    number: string | null;
    tier: string | null;
    reason: string | null;
  };
}

const OUTCOME: Record<Result["decision"], { label: string; tone: Tone }> = {
  allow: { label: "Allowed", tone: "good" },
  review: { label: "Needs review", tone: "warning" },
  block: { label: "Blocked", tone: "critical" },
};

const input =
  "h-9 w-full rounded-lg border border-line-strong bg-surface-2 px-2.5 text-sm text-fg outline-none focus:border-accent";
const dollars = (s: string) => Math.round((Number(s.replace(/[$,\s]/g, "")) || 0) * 100);

export function GatePlayground() {
  const [agent, setAgent] = useState<(typeof AGENTS)[number]["id"]>("momentum-trader");
  const [kind, setKind] = useState<"trade" | "payment">("trade");
  const [amount, setAmount] = useState("1500");
  const [instrument, setInstrument] = useState("MLUS");
  const [category, setCategory] = useState("software");
  const [mode, setMode] = useState<"auto" | "propose">("auto");
  const [perAction, setPerAction] = useState("2000");
  const [daily, setDaily] = useState("5000");
  const [usedToday, setUsedToday] = useState("0");
  const [allowed, setAllowed] = useState("");
  const [blocked, setBlocked] = useState("gambling, crypto-atm");
  const [kill, setKill] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    const split = (s: string) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    const sample =
      agent === "none"
        ? {}
        : agent === "yield-hunter-revoked"
          ? { sample: "yield-hunter", revoked: true }
          : { sample: agent };
    try {
      const res = await fetch("/api/gate/v1/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action:
            kind === "trade"
              ? { kind, amountCents: dollars(amount), side: "buy", instrument }
              : { kind, amountCents: dollars(amount), merchant: "Example merchant", category },
          agent: { id: agent, ...sample },
          policy: {
            mode,
            perActionLimitCents: dollars(perAction),
            dailyLimitCents: dollars(daily),
            allowedInstruments: split(allowed),
            blockedCategories: split(blocked),
            killSwitch: kill,
          },
          usage: { usedTodayCents: dollars(usedToday) },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Gate answered ${res.status}`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [
    agent,
    kind,
    amount,
    instrument,
    category,
    mode,
    perAction,
    daily,
    usedToday,
    allowed,
    blocked,
    kill,
  ]);

  // Decide straight away, and again a moment after each change.
  useEffect(() => {
    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [run]);

  const field = (label: string, el: React.ReactNode) => (
    <label className="block min-w-0 text-xs text-fg-2">
      {label}
      <div className="mt-1">{el}</div>
    </label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form
        className="min-w-0 space-y-5 rounded-2xl border-2 border-fg bg-surface p-5 shadow-[4px_4px_0_#111]"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <fieldset className="space-y-3">
          <legend className="font-pixel text-[10px] uppercase text-muted">The agent</legend>
          {field(
            "Who asks (AINRA testbed passports)",
            <select
              id="gate-agent"
              className={input}
              value={agent}
              onChange={(e) => setAgent(e.target.value as typeof agent)}
            >
              {AGENTS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>,
          )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-pixel text-[10px] uppercase text-muted">
            What it wants to do
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {field(
              "Action",
              <select
                id="gate-kind"
                className={input}
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
              >
                <option value="trade">Buy (trade)</option>
                <option value="payment">Pay (payment)</option>
              </select>,
            )}
            {field(
              "Amount ($)",
              <input
                id="gate-amount"
                className={input}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />,
            )}
          </div>
          {kind === "trade"
            ? field(
                "Instrument",
                <input
                  id="gate-instrument"
                  className={input}
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                />,
              )
            : field(
                "Merchant category",
                <input
                  id="gate-category"
                  className={input}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />,
              )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-pixel text-[10px] uppercase text-muted">
            Your firm&apos;s policy
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {field(
              "Per action ($)",
              <input
                id="gate-per-action"
                className={input}
                inputMode="decimal"
                value={perAction}
                onChange={(e) => setPerAction(e.target.value)}
              />,
            )}
            {field(
              "Per day ($)",
              <input
                id="gate-daily"
                className={input}
                inputMode="decimal"
                value={daily}
                onChange={(e) => setDaily(e.target.value)}
              />,
            )}
            {field(
              "Used today ($)",
              <input
                id="gate-used"
                className={input}
                inputMode="decimal"
                value={usedToday}
                onChange={(e) => setUsedToday(e.target.value)}
              />,
            )}
          </div>
          {field(
            "Allowed instruments (comma-separated; empty: any)",
            <input
              id="gate-allowed"
              className={input}
              placeholder="MLUS, MLWX"
              value={allowed}
              onChange={(e) => setAllowed(e.target.value)}
            />,
          )}
          {field(
            "Blocked merchant categories",
            <input
              id="gate-blocked"
              className={input}
              value={blocked}
              onChange={(e) => setBlocked(e.target.value)}
            />,
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg">
            <label className="flex items-center gap-2">
              <input
                id="gate-propose"
                type="checkbox"
                checked={mode === "propose"}
                onChange={() => setMode(mode === "auto" ? "propose" : "auto")}
                className="accent-[var(--accent)]"
              />
              Propose only
            </label>
            <label className="flex items-center gap-2">
              <input
                id="gate-kill"
                type="checkbox"
                checked={kill}
                onChange={() => setKill(!kill)}
                className="accent-[var(--critical)]"
              />
              Kill switch
            </label>
          </div>
        </fieldset>
      </form>

      <div className="min-w-0 space-y-4" aria-live="polite">
        {error && <p className="text-sm text-critical">{error}</p>}
        {result ? (
          <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={clsx(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 font-display text-lg",
                  result.decision === "allow" && "bg-good/15 text-good",
                  result.decision === "review" && "bg-warning/15 text-warning",
                  result.decision === "block" && "bg-critical/15 text-critical",
                )}
                data-decision={result.decision}
              >
                {result.decision === "allow" ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : result.decision === "review" ? (
                  <UserCheck className="h-4 w-4" aria-hidden />
                ) : (
                  <OctagonX className="h-4 w-4" aria-hidden />
                )}
                {OUTCOME[result.decision].label}
              </span>
              {busy && (
                <Loader2 className="h-4 w-4 animate-spin text-muted" aria-label="Deciding" />
              )}
            </div>
            <p className="text-sm text-fg">{result.summary}</p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {result.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                  <Badge
                    tone={
                      c.status === "pass" ? "good" : c.status === "review" ? "warning" : "critical"
                    }
                  >
                    {c.status}
                  </Badge>
                  <div className="min-w-0">
                    <div className="font-medium text-fg">{c.label}</div>
                    <div className="text-xs text-fg-2">{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-1 text-[11px] text-muted">
              <div>Decided {new Date(result.evidence.decidedAt).toUTCString()}</div>
              <div className="break-all font-mono">Evidence {result.evidence.decisionHash}</div>
            </div>
          </div>
        ) : (
          !error && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Asking Gate…
            </div>
          )
        )}
        <button
          type="button"
          className={buttonClass("secondary", "sm")}
          onClick={run}
          disabled={busy}
        >
          Decide again
        </button>
      </div>
    </div>
  );
}
