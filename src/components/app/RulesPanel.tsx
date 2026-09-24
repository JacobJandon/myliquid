"use client";

import clsx from "clsx";
import { Pause, Play, Trash2 } from "lucide-react";
import { useState } from "react";
import { postJson, useAction } from "@/components/client";
import { AgentAvatar, Badge, EmptyState, agentLabel, buttonClass } from "@/components/ui";

export interface RuleRow {
  id: string;
  name: string;
  status: "active" | "paused";
  lastTriggeredOn: string | null;
  createdBy: string;
}

const CONDITIONS = [
  { id: "price_below", label: "price falls below ($)" },
  { id: "price_above", label: "price rises above ($)" },
  { id: "drawdown_below", label: "falls from its 1-year high by (%)" },
  { id: "weight_above", label: "grows above portfolio share (%)" },
  { id: "weight_below", label: "shrinks below portfolio share (%)" },
];

export function RulesPanel({
  rules,
  products,
}: {
  rules: RuleRow[];
  products: { id: string; name: string }[];
}) {
  const { run, pending, error } = useAction();
  const [form, setForm] = useState({
    productId: products[0]?.id ?? "",
    condition: "drawdown_below",
    threshold: "20",
    action: "buy",
    amountUsd: "1000",
  });
  const isPct = form.condition !== "price_below" && form.condition !== "price_above";

  function create(e: React.FormEvent) {
    e.preventDefault();
    const raw = Number(form.threshold);
    const threshold =
      form.condition === "drawdown_below" ? -Math.abs(raw) / 100 : isPct ? raw / 100 : raw;
    void run(() =>
      postJson("/api/rules", {
        productId: form.productId,
        condition: form.condition,
        threshold,
        action: form.action,
        amountUsd: Number(form.amountUsd),
      }),
    );
  }

  const field =
    "h-10 rounded-xl border border-line-strong bg-surface-2 px-3 text-sm text-fg outline-none focus:border-accent";

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-2xl border border-line bg-surface/80 p-5">
        <div className="mb-3 text-sm font-medium text-fg">New rule</div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-fg-2">
          <span>When</span>
          <select
            className={field}
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
            aria-label="Product"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className={field}
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
            aria-label="Condition"
          >
            {CONDITIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            className={clsx(field, "w-28 tabular")}
            value={form.threshold}
            onChange={(e) => setForm({ ...form, threshold: e.target.value })}
            aria-label="Threshold"
            inputMode="decimal"
          />
          <span>then</span>
          <select
            className={field}
            value={form.action}
            onChange={(e) => setForm({ ...form, action: e.target.value })}
            aria-label="Action"
          >
            <option value="buy">buy</option>
            <option value="sell">sell</option>
          </select>
          <span>$</span>
          <input
            className={clsx(field, "w-28 tabular")}
            value={form.amountUsd}
            onChange={(e) => setForm({ ...form, amountUsd: e.target.value })}
            aria-label="Amount in dollars"
            inputMode="decimal"
          />
          <button className={buttonClass("primary")} disabled={pending}>
            Add rule
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Quant checks rules every market day. A rule fires at most once every 7 days, and the trade
          goes through Sentinel&apos;s checks and your autonomy setting like any other agent trade.
          You can also write rules in plain language in the Copilot.
        </p>
        {error && <p className="mt-2 text-xs text-critical">{error}</p>}
      </form>

      {rules.length === 0 ? (
        <EmptyState>No rules yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface/80 p-4"
            >
              <AgentAvatar agent={r.createdBy} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-fg">{r.name}</div>
                <div className="text-[11px] text-muted">
                  Created by {agentLabel(r.createdBy)} ·{" "}
                  {r.lastTriggeredOn ? `last fired ${r.lastTriggeredOn}` : "never fired"}
                </div>
              </div>
              <Badge tone={r.status === "active" ? "good" : "neutral"}>
                {r.status === "active" ? "Active" : "Paused"}
              </Badge>
              <button
                className={buttonClass("secondary", "sm")}
                disabled={pending}
                onClick={() =>
                  run(() =>
                    postJson(
                      `/api/rules/${r.id}`,
                      { status: r.status === "active" ? "paused" : "active" },
                      "PATCH",
                    ),
                  )
                }
              >
                {r.status === "active" ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {r.status === "active" ? "Pause" : "Activate"}
              </button>
              <button
                className={buttonClass("ghost", "sm")}
                disabled={pending}
                onClick={() => run(() => postJson(`/api/rules/${r.id}`, undefined, "DELETE"))}
                aria-label="Delete rule"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
