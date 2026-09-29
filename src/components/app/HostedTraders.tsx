"use client";

import clsx from "clsx";
import { Fingerprint, Loader2, Pause, Play, UserMinus, UserPlus, Zap } from "lucide-react";
import { useState } from "react";
import { postJson, useAction } from "@/components/client";
import { formatUsd } from "@/components/format";
import { Badge, EmptyState, buttonClass, type Tone } from "@/components/ui";

const inputClass =
  "h-9 rounded-lg border border-line-strong bg-surface-2 px-2.5 text-sm text-fg outline-none focus:border-accent";

export interface HireableAgent {
  id: string;
  label: string;
  tier: string;
  description: string;
  trades: boolean;
}

export interface HostedTraderView {
  id: string;
  agent: string;
  label: string;
  description: string;
  status: "active" | "paused" | "disconnected";
  tier: string | null;
  ainraNumber: string | null;
  identifiedUntil: number | null;
  runs: number;
  lastRunOn: string | null;
  limits: { auto: boolean; perTradeCents: number; dailyCents: number };
  record: { executed: number; proposed: number; volumeCents: number; pnlCents: number };
  last: {
    date: string;
    note: string;
    stopped: string | null;
    decisions: { title: string; outcome: string; detail: string }[];
  } | null;
}

const OUTCOME_TONE: Record<string, Tone> = {
  executed: "good",
  proposed: "warning",
  blocked: "critical",
  refused: "critical",
};

function HireForm({ agents, hired }: { agents: HireableAgent[]; hired: string[] }) {
  const { run, pending, error } = useAction();
  const available = agents.filter((a) => !hired.includes(a.id));
  const [picked, setPicked] = useState(available[0]?.id ?? "");
  const agentId = available.some((a) => a.id === picked) ? picked : (available[0]?.id ?? "");
  const agent = available.find((a) => a.id === agentId);
  const [auto, setAuto] = useState(true);
  const [perTrade, setPerTrade] = useState("1000");
  const [daily, setDaily] = useState("3000");

  if (available.length === 0)
    return <p className="text-xs text-muted">Every testbed trader already works for you.</p>;

  return (
    <form
      className="space-y-3 rounded-xl border border-line p-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() =>
          postJson("/api/traders", {
            agent: agentId,
            mode: auto && agent?.trades ? "auto" : "propose",
            perTradeLimitUsd: Number(perTrade) || 0,
            dailyLimitUsd: Number(daily) || 0,
          }),
        );
      }}
    >
      <label className="block text-xs text-fg-2">
        Hire
        <select
          className={clsx(inputClass, "mt-1 block w-full")}
          value={agentId}
          onChange={(e) => setPicked(e.target.value)}
          aria-label="Trader to hire"
        >
          {available.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} (AINRA {a.tier})
            </option>
          ))}
        </select>
      </label>
      {agent && <p className="text-xs text-fg-2">{agent.description}</p>}
      {agent?.trades && (
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <label className="flex items-center gap-2 text-sm text-fg">
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
                  inputMode="decimal"
                  onChange={(e) => setPerTrade(e.target.value)}
                  aria-label="Hosted trader per-trade limit"
                />
              </label>
              <label className="text-fg-2">
                Per day ($)
                <input
                  className={clsx(inputClass, "mt-1 block w-24")}
                  value={daily}
                  inputMode="decimal"
                  onChange={(e) => setDaily(e.target.value)}
                  aria-label="Hosted trader daily limit"
                />
              </label>
            </>
          )}
        </div>
      )}
      <button className={buttonClass("primary")} disabled={pending || !agentId}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{" "}
        Hire and start today
      </button>
      {error && <p className="text-xs text-critical">{error}</p>}
    </form>
  );
}

function TraderCard({ t, now }: { t: HostedTraderView; now: number }) {
  const { run, pending, error } = useAction();
  const identified = t.identifiedUntil !== null && t.identifiedUntil > now;
  return (
    <li data-trader={t.agent} className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Fingerprint className="h-4 w-4 text-accent" aria-hidden />
        <span className="text-sm font-medium text-fg">{t.label}</span>
        {t.tier && <Badge tone="accent">AINRA {t.tier}</Badge>}
        <Badge tone={t.status === "active" ? "good" : "neutral"}>
          {t.status === "active" ? "working" : "paused"}
        </Badge>
        {identified && <Badge>passport fresh</Badge>}
        <span className="ml-auto flex flex-wrap gap-1">
          <button
            className={buttonClass("secondary", "sm")}
            disabled={pending || t.status !== "active"}
            onClick={() => run(() => postJson(`/api/traders/${t.id}/run`))}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}{" "}
            Run now
          </button>
          <button
            className={buttonClass("ghost", "sm")}
            disabled={pending}
            onClick={() =>
              run(() =>
                postJson(
                  `/api/traders/${t.id}`,
                  { status: t.status === "active" ? "paused" : "active" },
                  "PATCH",
                ),
              )
            }
          >
            {t.status === "active" ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Resume
              </>
            )}
          </button>
          <button
            className={buttonClass("ghost", "sm")}
            disabled={pending}
            onClick={() => run(() => postJson(`/api/traders/${t.id}`, undefined, "DELETE"))}
          >
            <UserMinus className="h-3.5 w-3.5" /> Let go
          </button>
        </span>
      </div>
      {t.ainraNumber && (
        <div className="break-all font-mono text-[11px] text-fg-2">{t.ainraNumber}</div>
      )}
      <p className="text-xs text-fg-2">{t.description}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-muted">Limits</dt>
          <dd className="text-fg">
            {t.limits.auto
              ? `${formatUsd(t.limits.perTradeCents)} a trade · ${formatUsd(t.limits.dailyCents)} a day`
              : "proposes only"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Traded on its own</dt>
          <dd className="text-fg">
            {t.record.executed} · {formatUsd(t.record.volumeCents)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Proposals</dt>
          <dd className="text-fg">{t.record.proposed}</dd>
        </div>
        <div>
          <dt className="text-muted">P&amp;L on its trades</dt>
          <dd className={t.record.pnlCents >= 0 ? "text-good" : "text-critical"}>
            {formatUsd(t.record.pnlCents, { sign: true })}
          </dd>
        </div>
      </dl>
      {t.last ? (
        <div className="rounded-lg bg-surface-2 p-3 text-xs">
          <div className="mb-1 font-medium text-fg">
            Market day {t.last.date} · run {t.runs}
          </div>
          {t.last.stopped ? (
            <p className="text-critical">Stopped: {t.last.stopped}</p>
          ) : (
            <>
              <p className="text-fg-2">{t.last.note}</p>
              {t.last.decisions.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {t.last.decisions.map((d, i) => (
                    <li key={i} className="flex flex-wrap items-start gap-2">
                      <Badge tone={OUTCOME_TONE[d.outcome] ?? "neutral"}>{d.outcome}</Badge>
                      <span className="font-medium text-fg">{d.title}</span>
                      <span className="w-full text-fg-2 sm:w-auto">{d.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted">Hasn&apos;t worked a market day yet.</p>
      )}
      {error && <p className="text-xs text-critical">{error}</p>}
    </li>
  );
}

/** Traders MyLiquid hosts for the investor, working once every market day. */
export function HostedTraders({
  traders,
  agents,
  now,
}: {
  traders: HostedTraderView[];
  agents: HireableAgent[];
  /** Server time (unix seconds), so badges render the same on server and client. */
  now: number;
}) {
  return (
    <div className="space-y-4">
      {traders.length === 0 ? (
        <EmptyState>No hosted traders yet. Hire one below; it starts today.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {traders.map((t) => (
            <TraderCard key={t.id} t={t} now={now} />
          ))}
        </ul>
      )}
      <HireForm agents={agents} hired={traders.map((t) => t.agent)} />
    </div>
  );
}
