"use client";

import clsx from "clsx";
import { Check, CircleDashed, Loader2, ShieldCheck, ShieldX, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Inspection, TamperId } from "@/lib/ainra/inspect";
import { Badge, buttonClass } from "@/components/ui";

/**
 * The tamper lab: pick a real AINRA passport, optionally alter a copy, and see MyLiquid's verifier decide, step
 * by step, and what the agent may do as a result. Every result comes from /api/ainra/inspect (`checkPassport`).
 */

const AGENTS = [
  { id: "momentum-trader", label: "Northwind Momentum Trader", note: "L2 · read, trade" },
  { id: "treasury-agent", label: "Harbor Treasury Agent", note: "L3 · read, trade, pay" },
  { id: "research-analyst", label: "Northwind Research Analyst", note: "L1 · read" },
  { id: "yield-hunter", label: "QuickFox Yield Hunter", note: "L2 · later revoked" },
] as const;

type AgentId = (typeof AGENTS)[number]["id"];

export interface TamperOption {
  id: TamperId;
  label: string;
  why?: string;
}

const date = (unix: number | null) =>
  unix === null ? "—" : new Date(unix * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC";
const bytes = (n: number) => `${n.toLocaleString("en-US")} bytes`;
const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`;

export function AinraInspector({
  tampers,
  testbed,
}: {
  tampers: TamperOption[];
  /** Testbed passports are only available in testbed mode; otherwise visitors paste one. */
  testbed: boolean;
}) {
  const [agent, setAgent] = useState<AgentId>("momentum-trader");
  const [how, setHow] = useState<TamperId>("none");
  const [pasted, setPasted] = useState("");
  const [usePasted, setUsePasted] = useState(!testbed);
  const [result, setResult] = useState<Inspection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    if (usePasted && !pasted.trim()) {
      setResult(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ainra/inspect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          usePasted ? { passport: pasted, tamper: how } : { sample: agent, tamper: how },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setBusy(false);
    }
  }, [agent, how, pasted, usePasted]);

  useEffect(() => {
    const t = setTimeout(run, 150);
    return () => clearTimeout(t);
  }, [run]);

  const revokedOnly = (t: TamperOption) =>
    t.id === "revoked" && (usePasted || agent !== "yield-hunter");
  const chosen = tampers.find((t) => t.id === how);
  const valid = result?.check.status === "valid";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="min-w-0 space-y-5 self-start rounded-2xl border-2 border-fg bg-surface p-5 shadow-[4px_4px_0_#111] lg:sticky lg:top-4">
        <fieldset>
          <legend className="font-pixel text-[10px] uppercase text-muted">1 · A passport</legend>
          <div className="mt-2 grid gap-2">
            {testbed &&
              AGENTS.map((a) => (
                <label
                  key={a.id}
                  className={clsx(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm",
                    !usePasted && agent === a.id
                      ? "border-fg bg-surface-2 shadow-[2px_2px_0_#111]"
                      : "border-line hover:border-line-strong",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="ainra-agent"
                      className="accent-[var(--accent)]"
                      checked={!usePasted && agent === a.id}
                      onChange={() => {
                        setUsePasted(false);
                        setAgent(a.id);
                        if (how === "revoked" && a.id !== "yield-hunter") setHow("none");
                      }}
                    />
                    <span className="text-fg">{a.label}</span>
                  </span>
                  <span className="text-xs text-muted">{a.note}</span>
                </label>
              ))}
            <label
              className={clsx(
                "block rounded-xl border px-3 py-2 text-sm",
                usePasted ? "border-fg bg-surface-2" : "border-line",
              )}
            >
              <span className="flex items-center gap-2 text-fg">
                <input
                  type="radio"
                  name="ainra-agent"
                  className="accent-[var(--accent)]"
                  checked={usePasted}
                  onChange={() => {
                    setUsePasted(true);
                    if (how === "revoked") setHow("none");
                  }}
                />
                Paste any AINRA presentation
              </span>
              {usePasted && (
                <textarea
                  aria-label="AINRA presentation"
                  className="mt-2 h-28 w-full rounded-lg border border-line-strong bg-surface p-2 font-mono text-[11px] text-fg outline-none focus:border-accent"
                  placeholder="JSON, or base64url of JSON (the x-ainra-passport header)"
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                />
              )}
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-pixel text-[10px] uppercase text-muted">
            2 · Try to cheat (optional)
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {tampers.map((t) => (
              <button
                key={t.id}
                type="button"
                data-tamper={t.id}
                disabled={revokedOnly(t)}
                onClick={() => setHow(t.id)}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40",
                  how === t.id
                    ? "border-fg bg-fg text-bg"
                    : "border-line-strong bg-surface text-fg hover:border-fg",
                )}
                title={revokedOnly(t) ? "Only the QuickFox Yield Hunter was revoked" : t.why}
              >
                {t.label}
              </button>
            ))}
          </div>
          {chosen?.why && <p className="mt-3 text-xs text-fg-2">{chosen.why}</p>}
        </fieldset>
      </div>

      <div className="min-w-0 space-y-4" aria-live="polite">
        {error && <p className="text-sm text-critical">{error}</p>}
        {!result && !error && (
          <div className="flex items-center gap-2 text-sm text-muted">
            {usePasted && !pasted.trim() ? (
              "Paste a presentation to verify it."
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Verifying…
              </>
            )}
          </div>
        )}
        {result && (
          <>
            <div
              className={clsx(
                "rounded-2xl border-2 p-5",
                valid ? "border-good bg-good/10" : "border-critical bg-critical/10",
              )}
              data-verdict={result.check.status}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={clsx(
                    "inline-flex items-center gap-2 font-display text-2xl",
                    valid ? "text-good" : "text-critical",
                  )}
                >
                  {valid ? <ShieldCheck className="h-6 w-6" /> : <ShieldX className="h-6 w-6" />}
                  {valid ? "Valid passport" : "Refused"}
                </span>
                {result.check.reason && (
                  <code className="rounded bg-critical/15 px-2 py-0.5 font-mono text-xs text-critical">
                    {result.check.reason}
                  </code>
                )}
                {busy && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted" aria-label="Verifying" />
                )}
              </div>
              <p className="mt-2 text-sm text-fg">
                {result.explanation ??
                  `${result.check.name ?? "This agent"} is who it says it is, as of ${date(result.check.checkedAt)}.`}
              </p>
              <p className="mt-1 text-xs text-fg-2">
                <span className="font-semibold">MyLiquid lets it:</span> {result.grant.summary}
              </p>
            </div>

            <ol className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {result.steps.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start gap-3 px-4 py-2.5 text-sm"
                  data-step={s.id}
                >
                  <span
                    className={clsx(
                      "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                      s.state === "pass" && "bg-good text-white",
                      s.state === "fail" && "bg-critical text-white",
                      s.state === "unchecked" && "text-muted",
                    )}
                    aria-label={s.state}
                  >
                    {s.state === "pass" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : s.state === "fail" ? (
                      <X className="h-3.5 w-3.5" />
                    ) : (
                      <CircleDashed className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className={clsx(s.state === "unchecked" ? "text-muted" : "text-fg")}>
                      {s.label}
                    </div>
                    {s.detail && <div className="text-xs text-muted">{s.detail}</div>}
                  </div>
                </li>
              ))}
            </ol>
            {!valid && (
              <p className="-mt-2 text-[11px] text-muted">
                AINRA fails closed and stops at the first failed check, so the others show as not
                reached.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-pixel text-[10px] uppercase text-muted">
                    Inside the passport
                  </span>
                  {["widen", "promote", "quantum", "unlogged"].includes(result.tamper) && (
                    <Badge tone="warning">altered copy</Badge>
                  )}
                </div>
                <dl className="mt-2 space-y-1.5">
                  {(
                    [
                      ["AINRA Number", result.anatomy.sub],
                      ["Tier", result.anatomy.tier],
                      ["Declares", result.anatomy.capabilities.join(", ") || "—"],
                      ["Accountable to", result.anatomy.authority.principal],
                      [
                        "Valid",
                        `${date(result.anatomy.notBefore)} → ${date(result.anatomy.expires)}`,
                      ],
                      [
                        "Signatures",
                        `Ed25519 ${bytes(result.anatomy.signatures.ed25519)} + ML-DSA-65 ${bytes(result.anatomy.signatures.mldsa65)}`,
                      ],
                      [
                        "Log",
                        `${result.anatomy.log.origin ?? "—"} · leaf ${result.anatomy.log.leaf ?? "—"} of ${result.anatomy.log.size ?? "—"} · ${result.anatomy.log.proofHashes} proof hashes`,
                      ],
                      [
                        "Status",
                        `${result.anatomy.status.uri ?? "—"} · signed ${date(result.anatomy.status.issuedAt)}`,
                      ],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
                      <dt className="text-muted">{k}</dt>
                      <dd className="break-words text-fg">{v ?? "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 text-xs">
                <div className="font-pixel text-[10px] uppercase text-muted">
                  What MyLiquid grants
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["read", "trade", "pay"].map((s) => (
                    <Badge key={s} tone={result.grant.scopes.includes(s) ? "good" : "neutral"}>
                      {result.grant.scopes.includes(s) ? "✓" : "✗"} {s}
                    </Badge>
                  ))}
                </div>
                <dl className="mt-3 space-y-1.5">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Trades on its own</dt>
                    <dd className="text-fg">
                      {result.grant.tradesOnItsOwn ? "Yes" : "No, proposes"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Most per order, alone</dt>
                    <dd className="text-fg">
                      {result.grant.autoCeilingCents ? usd(result.grant.autoCeilingCents) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Presentation size</dt>
                    <dd className="text-fg">{bytes(result.anatomy.totalBytes)}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-muted">
                  Then the investor&apos;s own limits, the mandate and Sentinel&apos;s checks still
                  apply, and the kill switch stops it.
                </p>
              </div>
            </div>
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={run}
              disabled={busy}
            >
              Verify again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
