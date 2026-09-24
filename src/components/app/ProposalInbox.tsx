"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import type { Proposal } from "@/lib/services/proposals";
import { postJson, useAction } from "@/components/client";
import { formatUsd } from "@/components/format";
import { AgentAvatar, Badge, EmptyState, agentLabel, buttonClass } from "@/components/ui";

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
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-critical/50 px-3 py-2 text-xs text-fg">
          {error}
        </div>
      )}
      {proposals.map((p) => {
        const warnings = p.checks.flat().filter((c) => c.status === "warn");
        return (
          <article key={p.id} className="rounded-xl border border-line bg-surface-2/60 p-4">
            <div className="flex items-start gap-3">
              <AgentAvatar agent={p.agent} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-medium text-fg">{p.title}</h3>
                  <Badge tone="violet">{agentLabel(p.agent)}</Badge>
                  {warnings.length > 0 && (
                    <Badge tone="warning">
                      {warnings.length} warning{warnings.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <ul className="mt-2 space-y-1 text-xs text-fg-2">
                  {p.orders.map((o, i) => (
                    <li key={i} className="flex gap-2 tabular">
                      <span className={o.side === "buy" ? "text-fg" : "text-fg"}>
                        {o.side === "buy" ? "Buy" : "Sell"}
                      </span>
                      <span className="font-medium text-fg">{formatUsd(o.amountCents)}</span>
                      <span>{o.productId}</span>
                      {o.reason && <span className="truncate text-muted">· {o.reason}</span>}
                    </li>
                  ))}
                </ul>
                <button
                  className="mt-2 text-xs text-accent hover:underline"
                  onClick={() => setOpen(open === p.id ? null : p.id)}
                >
                  {open === p.id ? "Hide" : "Show"} rationale & checks
                </button>
                {open === p.id && (
                  <div className="mt-2 space-y-2 rounded-lg border border-line p-3 text-xs">
                    <p className="whitespace-pre-line text-fg-2">{p.rationale}</p>
                    <ul className="space-y-0.5">
                      {p.checks.flat().map((c, i) => (
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
                <div className="mt-3 flex gap-1.5">
                  <button
                    className={buttonClass("primary", "sm")}
                    disabled={pending}
                    onClick={() =>
                      run(() => postJson(`/api/proposals/${p.id}`, { action: "approve" }))
                    }
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    className={buttonClass("ghost", "sm")}
                    disabled={pending}
                    onClick={() =>
                      run(() => postJson(`/api/proposals/${p.id}`, { action: "reject" }))
                    }
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
