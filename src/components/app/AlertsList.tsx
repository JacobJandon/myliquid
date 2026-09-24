"use client";

import { X } from "lucide-react";
import type { Alert } from "@/lib/services/alerts";
import { postJson, useAction } from "@/components/client";
import { EmptyState, SeverityIcon, agentLabel } from "@/components/ui";

export function AlertsList({ alerts }: { alerts: Alert[] }) {
  const { run, pending } = useAction();
  if (alerts.length === 0)
    return <EmptyState>No open alerts. Sentinel and Ledger are watching.</EmptyState>;
  return (
    <ul className="space-y-2">
      {alerts.map((a) => (
        <li key={a.id} className="flex gap-3 rounded-xl border border-line bg-surface-2/60 p-3">
          <SeverityIcon severity={a.severity} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-medium text-fg">{a.title}</span>
              <span className="text-[11px] text-muted">
                {a.severity === "critical"
                  ? "Critical"
                  : a.severity === "warn"
                    ? "Warning"
                    : "Info"}{" "}
                · {agentLabel(a.agent)} · {a.createdOn}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-fg-2">{a.detail}</p>
          </div>
          <button
            className="h-6 w-6 shrink-0 rounded-full text-muted hover:bg-surface-3 hover:text-fg"
            disabled={pending}
            onClick={() => run(() => postJson(`/api/alerts/${a.id}`))}
            aria-label="Dismiss alert"
            title="Dismiss"
          >
            <X className="mx-auto h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
