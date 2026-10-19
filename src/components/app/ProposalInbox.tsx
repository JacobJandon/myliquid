"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { getProduct } from "@/lib/domain/catalog";
import type { Proposal } from "@/lib/services/proposals";
import { postJson, useAction } from "@/components/client";
import { formatUsd } from "@/components/format";
import { Badge, EmptyState, agentLabel, buttonClass } from "@/components/ui";

/**
 * The decision: the one hard-shadowed object on Home (docs/design/rules.md §3). It lifts off the paper when it
 * arrives, reads top to bottom as who → what → why → checks → decide, and puts Approve first.
 */
export function ProposalInbox({ proposals }: { proposals: Proposal[] }) {
  const { run, pending, error } = useAction();
  const [open, setOpen] = useState<string | null>(null);

  if (proposals.length === 0) {
    return (
      <EmptyState>
        No proposals waiting. When an agent wants to trade, it will ask you here first.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-[10px] border border-critical/50 px-3 py-2 text-xs text-fg">
          {error}
        </div>
      )}
      {proposals.map((p, n) => {
        const checks = p.checks.flat();
        const warnings = checks.filter((c) => c.status === "warn");
        const passed = checks.filter((c) => c.status === "pass").length;
        return (
          <article
            key={p.id}
            className="anim-lift rounded-card border-2 border-fg bg-surface p-4 shadow-[4px_4px_0_var(--fg)] sm:p-5"
            style={{ ["--d" as string]: `${120 + n * 90}ms` }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="kicker flex items-center gap-2 text-accent">
                <span className="relative inline-flex h-1.5 w-1.5" aria-hidden>
                  <span className="anim-ping absolute inset-0 rounded-full bg-accent" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
                Waiting for you{proposals.length > 1 ? ` · ${n + 1} of ${proposals.length}` : ""}
              </span>
              <span className="num truncate text-[11px] text-muted">
                from {agentLabel(p.agent)}
              </span>
            </div>
            <h3 className="type-title mt-2 text-fg">{p.title}</h3>
            {(p.ainraNumber || warnings.length > 0) && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {p.ainraNumber && (
                  <Badge tone="accent" className="font-mono">
                    AINRA {p.ainraNumber.replace(/^did:ainra:/, "")}
                  </Badge>
                )}
                {warnings.length > 0 && (
                  <Badge tone="warning">
                    {warnings.length} warning{warnings.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            )}
            <ul className="mt-3 space-y-2 text-sm">
              {p.orders.map((o, i) => (
                <li key={i}>
                  <span className="text-fg">
                    {o.side === "buy" ? "Buy" : "Sell"}{" "}
                    <span className="num font-medium">{formatUsd(o.amountCents)}</span> of{" "}
                    {getProduct(o.productId)?.name ?? o.productId}
                  </span>
                  {o.reason && (
                    <span className="mt-0.5 block text-xs text-fg-2">{o.reason}</span>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 flex items-center gap-1.5 text-xs text-fg-2 hover:text-fg"
              onClick={() => setOpen(open === p.id ? null : p.id)}
              aria-expanded={open === p.id}
            >
              <Check className="h-3.5 w-3.5 text-good" aria-hidden />
              <span>
                {passed} of {checks.length} checks passed
              </span>
              <span className="text-accent underline-offset-2 hover:underline">
                · {open === p.id ? "Hide" : "Why?"}
              </span>
            </button>
            {open === p.id && (
              <div className="anim-rise mt-2 space-y-2 rounded-[10px] bg-surface-2 p-3 text-xs">
                <p className="whitespace-pre-line text-fg-2">{p.rationale}</p>
                <ul className="space-y-0.5">
                  {checks.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden>
                        {c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "✕"}
                      </span>
                      <span className="text-fg">{c.label}:</span>
                      <span className="text-fg-2">{c.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                className={buttonClass("primary")}
                disabled={pending}
                onClick={() => run(() => postJson(`/api/proposals/${p.id}`, { action: "approve" }))}
              >
                <Check className="h-4 w-4" /> Approve
              </button>
              <button
                className={buttonClass("secondary")}
                disabled={pending}
                onClick={() => run(() => postJson(`/api/proposals/${p.id}`, { action: "reject" }))}
              >
                <X className="h-4 w-4" /> Reject
              </button>
              <span className="ml-1 text-xs text-muted max-sm:basis-full max-sm:ml-0">
                Nothing happens until you approve.
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
