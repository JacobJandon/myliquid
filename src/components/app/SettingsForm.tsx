"use client";

import clsx from "clsx";
import { OctagonAlert, Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AgentMandate, RiskProfileId } from "@/lib/domain/types";
import { postJson, useAction } from "@/components/client";
import { buttonClass } from "@/components/ui";

const PROFILES: { id: RiskProfileId; label: string; description: string }[] = [
  { id: "conservative", label: "Conservative", description: "≤10% illiquid · ≤2% bitcoin" },
  { id: "balanced", label: "Balanced", description: "≤25% illiquid · ≤5% bitcoin" },
  { id: "growth", label: "Growth", description: "≤35% illiquid · ≤10% bitcoin" },
  { id: "aggressive", label: "Aggressive", description: "≤45% illiquid · ≤15% bitcoin" },
];

const SLEEVES = [
  { id: "index", label: "Index funds" },
  { id: "trading", label: "Active trading" },
  { id: "bitcoin", label: "Bitcoin" },
  { id: "business", label: "Business interests" },
  { id: "private", label: "Private equity & credit" },
] as const;

const AGENT_TOGGLES = [
  { id: "atlas", label: "Atlas" },
  { id: "quant", label: "Quant" },
  { id: "scout", label: "Scout" },
  { id: "ledger", label: "Ledger" },
  { id: "sentinel", label: "Sentinel" },
] as const;

export function KillSwitch({ mandate }: { mandate: AgentMandate }) {
  const { run, pending } = useAction();
  return (
    <div
      className={clsx(
        "flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5",
        mandate.killSwitch ? "border-critical/60 bg-critical/10" : "border-line bg-surface",
      )}
    >
      <div className="flex items-start gap-3">
        <OctagonAlert
          className={clsx("mt-0.5 h-5 w-5", mandate.killSwitch ? "text-critical" : "text-muted")}
        />
        <div>
          <div className="text-sm font-semibold text-fg">
            {mandate.killSwitch ? "Kill switch is ON: all agents are paused" : "Kill switch"}
          </div>
          <div className="text-xs text-fg-2">
            {mandate.killSwitch
              ? (mandate.killReason ?? "Paused.")
              : "One click pauses every agent and autopilot rule. Agents can pull it in an emergency; only you can release it."}
          </div>
        </div>
      </div>
      <button
        className={buttonClass(mandate.killSwitch ? "primary" : "danger")}
        disabled={pending}
        onClick={() =>
          run(() =>
            postJson("/api/settings", { mandate: { killSwitch: !mandate.killSwitch } }, "PATCH"),
          )
        }
      >
        <Power className="h-4 w-4" />
        {mandate.killSwitch ? "Resume agents" : "Pause all agents"}
      </button>
    </div>
  );
}

export function SettingsForm({
  riskProfile,
  mandate,
}: {
  riskProfile: RiskProfileId;
  mandate: AgentMandate;
}) {
  const { run, pending, error } = useAction();
  const [profile, setProfile] = useState(riskProfile);
  const [m, setM] = useState({
    autonomy: mandate.autonomy,
    autoExecuteLimit: mandate.autoExecuteLimitCents / 100,
    agentBudget: mandate.agentBudgetCents / 100,
    perOrderCap: mandate.perOrderCapCents / 100,
    dailyCap: mandate.dailyCapCents / 100,
    maxOrdersPerDay: mandate.maxOrdersPerDay,
    allowedSleeves: mandate.allowedSleeves as string[],
    readOnly: mandate.readOnly,
    circuitBreakerPct: mandate.circuitBreakerPct * 100,
    disabledAgents: mandate.disabledAgents as string[],
  });
  const [saved, setSaved] = useState(false);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const res = await run(() =>
      postJson(
        "/api/settings",
        {
          riskProfile: profile,
          mandate: {
            autonomy: m.autonomy,
            autoExecuteLimitCents: Math.round(m.autoExecuteLimit * 100),
            agentBudgetCents: Math.round(m.agentBudget * 100),
            perOrderCapCents: Math.round(m.perOrderCap * 100),
            dailyCapCents: Math.round(m.dailyCap * 100),
            maxOrdersPerDay: Math.round(m.maxOrdersPerDay),
            allowedSleeves: m.allowedSleeves,
            readOnly: m.readOnly,
            circuitBreakerPct: m.circuitBreakerPct / 100,
            disabledAgents: m.disabledAgents,
          },
        },
        "PATCH",
      ),
    );
    if (res) setSaved(true);
  }

  const input =
    "h-10 w-full rounded-xl border border-line-strong bg-surface-2 px-3 text-sm text-fg outline-none focus:border-accent tabular";
  const num = (key: keyof typeof m, label: string, hint: string, prefix = "$") => (
    <label className="block">
      <span className="text-xs text-fg-2">{label}</span>
      <div className="relative mt-1">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={0}
          className={clsx(input, prefix && "pl-7")}
          value={m[key] as number}
          onChange={(e) => setM({ ...m, [key]: Number(e.target.value) })}
        />
      </div>
      <span className="mt-1 block text-[11px] text-muted">{hint}</span>
    </label>
  );

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-fg">Risk profile</h2>
        <p className="text-xs text-muted">
          Sets target allocation and the hard limits Sentinel enforces on every trade.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PROFILES.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setProfile(p.id)}
              className={clsx(
                "rounded-xl border p-3 text-left",
                profile === p.id
                  ? "border-fg bg-surface-2 shadow-[2px_2px_0_#111]"
                  : "border-line hover:border-line-strong",
              )}
              aria-pressed={profile === p.id}
            >
              <div className="text-sm font-medium text-fg">{p.label}</div>
              <div className="text-[11px] text-muted">{p.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-fg">Agent autonomy</h2>
        <p className="text-xs text-muted">
          Robinhood, Public and Webull all separate what an agent may do alone from what needs you.
          So do we.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(
            [
              {
                id: "propose",
                label: "Propose only",
                text: "Every agent trade waits in your inbox for approval. (Default)",
              },
              {
                id: "bounded",
                label: "Bounded autonomy",
                text: "Small trades within the mandate below execute on their own. Everything else is proposed.",
              },
            ] as const
          ).map((o) => (
            <button
              type="button"
              key={o.id}
              onClick={() => setM({ ...m, autonomy: o.id })}
              className={clsx(
                "rounded-xl border p-3 text-left",
                m.autonomy === o.id
                  ? "border-fg bg-surface-2 shadow-[2px_2px_0_#111]"
                  : "border-line hover:border-line-strong",
              )}
              aria-pressed={m.autonomy === o.id}
            >
              <div className="text-sm font-medium text-fg">{o.label}</div>
              <div className="text-[11px] text-muted">{o.text}</div>
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {num(
            "autoExecuteLimit",
            "Auto-execute limit",
            "Bounded mode: max size of a trade with no approval",
          )}
          {num("perOrderCap", "Per-order cap", "No autonomous order above this")}
          {num("dailyCap", "Daily cap", "Total autonomous volume per day")}
          {num("agentBudget", "Agent budget", "Hard ceiling on net autonomous buying")}
          {num(
            "maxOrdersPerDay",
            "Max orders per day",
            "Rate limit that damps herd-like bursts",
            "",
          )}
          {num("circuitBreakerPct", "Circuit breaker (%)", "Daily drop that pauses all agents", "")}
        </div>
        <div className="mt-5">
          <div className="text-xs text-fg-2">Sleeves agents may trade on their own</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {SLEEVES.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-fg"
              >
                <input
                  type="checkbox"
                  checked={m.allowedSleeves.includes(s.id)}
                  onChange={() => setM({ ...m, allowedSleeves: toggle(m.allowedSleeves, s.id) })}
                  className="accent-[var(--accent)]"
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={m.readOnly}
              onChange={() => setM({ ...m, readOnly: !m.readOnly })}
              className="accent-[var(--accent)]"
            />
            Read-only mode (agents may analyze but never trade)
          </label>
        </div>
        <div className="mt-5">
          <div className="text-xs text-fg-2">Enabled agents</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {AGENT_TOGGLES.map((a) => (
              <label
                key={a.id}
                className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-fg"
              >
                <input
                  type="checkbox"
                  checked={!m.disabledAgents.includes(a.id)}
                  onChange={() => setM({ ...m, disabledAgents: toggle(m.disabledAgents, a.id) })}
                  className="accent-[var(--accent)]"
                />
                {a.label}
              </label>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button className={buttonClass("primary")} disabled={pending}>
          Save guardrails
        </button>
        {saved && <span className="text-xs text-fg-2">Saved.</span>}
        {error && <span className="text-xs text-critical">{error}</span>}
      </div>
    </form>
  );
}

export function AccountActions({ isGuest }: { isGuest: boolean }) {
  const { run, pending, error } = useAction();
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className={buttonClass("secondary", "sm")}
        disabled={pending}
        onClick={() => {
          if (
            window.confirm(
              "Start over with a year-old sample portfolio? This wipes your trades, agent activity, rules and chat.",
            )
          ) {
            void run(() => postJson("/api/account/reset", { starter: "sample" }));
          }
        }}
      >
        Reset to sample portfolio
      </button>
      <button
        className={buttonClass("secondary", "sm")}
        disabled={pending}
        onClick={() => {
          if (
            window.confirm(
              "Start over with $100,000 in demo cash and no holdings? This wipes your trades, agent activity, rules and chat.",
            )
          ) {
            void run(() => postJson("/api/account/reset", { starter: "cash" }));
          }
        }}
      >
        Reset to cash
      </button>
      <button
        className={buttonClass("ghost", "sm")}
        disabled={pending}
        onClick={async () => {
          await postJson("/api/auth/logout");
          router.push("/");
          router.refresh();
        }}
      >
        Log out
      </button>
      <button
        className={buttonClass("danger", "sm")}
        disabled={pending}
        onClick={async () => {
          if (
            window.confirm(
              isGuest
                ? "Delete this guest account?"
                : "Permanently delete your account and all of its data?",
            )
          ) {
            await postJson("/api/account", undefined, "DELETE");
            router.push("/");
            router.refresh();
          }
        }}
      >
        Delete account
      </button>
      {error && <span className="text-xs text-critical">{error}</span>}
    </div>
  );
}
