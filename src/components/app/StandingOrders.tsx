"use client";

import clsx from "clsx";
import { CalendarClock, Pause, Play, Trash2, X } from "lucide-react";
import { useState } from "react";
import { CADENCE_LABELS, type Cadence } from "@/lib/domain/automation";
import { postJson, useAction } from "@/components/client";
import { formatPrice, formatUsd } from "@/components/format";
import { Badge, EmptyState, buttonClass, type Tone } from "@/components/ui";

export interface PlanRow {
  id: string;
  productName: string;
  amountCents: number;
  cadence: Cadence;
  status: "active" | "paused";
  nextRunOn: string;
  lastRunOn: string | null;
  lastResult: string | null;
  runs: number;
}

const field =
  "h-10 rounded-xl border border-line-strong bg-surface-2 px-3 text-sm text-fg outline-none focus:border-accent";

/** Set up and manage recurring investments. */
export function RecurringPanel({
  plans,
  products,
}: {
  plans: PlanRow[];
  products: { id: string; name: string }[];
}) {
  const { run, pending, error } = useAction();
  const [form, setForm] = useState({
    productId: products[0]?.id ?? "",
    amountUsd: "250",
    cadence: "monthly" as Cadence,
  });

  return (
    <div className="space-y-4">
      <form
        className="rounded-2xl border border-line bg-surface p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() =>
            postJson("/api/recurring", {
              productId: form.productId,
              amountUsd: Number(form.amountUsd),
              cadence: form.cadence,
            }),
          );
        }}
      >
        <div className="mb-3 text-sm font-medium text-fg">New recurring investment</div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-fg-2">
          <span>Invest $</span>
          <input
            className={clsx(field, "w-28 tabular")}
            value={form.amountUsd}
            onChange={(e) => setForm({ ...form, amountUsd: e.target.value.replace(/[^\d.]/g, "") })}
            inputMode="decimal"
            aria-label="Amount per buy in dollars"
          />
          <span>in</span>
          <select
            className={field}
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
            aria-label="Product to buy"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className={field}
            value={form.cadence}
            onChange={(e) => setForm({ ...form, cadence: e.target.value as Cadence })}
            aria-label="How often"
          >
            {(Object.keys(CADENCE_LABELS) as Cadence[]).map((c) => (
              <option key={c} value={c}>
                {CADENCE_LABELS[c].toLowerCase()}
              </option>
            ))}
          </select>
          <button className={buttonClass("primary")} disabled={pending || !Number(form.amountUsd)}>
            Start
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          The first buy happens on the next market day. Recurring investments are your own
          instructions, so they keep running when agents are paused, but every buy still passes
          Sentinel&apos;s checks: if cash runs short or a limit would be broken, that buy is skipped
          and you get an alert.
        </p>
        {error && <p className="mt-2 text-xs text-critical">{error}</p>}
      </form>

      {plans.length === 0 ? (
        <EmptyState>No recurring investments yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {plans.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4"
            >
              <CalendarClock className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-fg">
                  {formatUsd(p.amountCents)} of {p.productName} ·{" "}
                  {CADENCE_LABELS[p.cadence].toLowerCase()}
                </div>
                <div className="text-[11px] text-muted">
                  {p.status === "active" ? `Next buy ${p.nextRunOn}` : "Paused"} · {p.runs} buy
                  {p.runs === 1 ? "" : "s"} so far
                  {p.lastResult && p.lastResult !== "filled" && (
                    <span className="text-serious"> · last run {p.lastResult}</span>
                  )}
                </div>
              </div>
              <Badge tone={p.status === "active" ? "good" : "neutral"}>
                {p.status === "active" ? "Active" : "Paused"}
              </Badge>
              <button
                className={buttonClass("secondary", "sm")}
                disabled={pending}
                onClick={() =>
                  run(() =>
                    postJson(
                      `/api/recurring/${p.id}`,
                      { status: p.status === "active" ? "paused" : "active" },
                      "PATCH",
                    ),
                  )
                }
              >
                {p.status === "active" ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {p.status === "active" ? "Pause" : "Resume"}
              </button>
              <button
                className={buttonClass("ghost", "sm")}
                disabled={pending}
                onClick={() => run(() => postJson(`/api/recurring/${p.id}`, undefined, "DELETE"))}
                aria-label={`Delete recurring investment in ${p.productName}`}
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

export interface LimitRow {
  id: string;
  productName: string;
  side: "buy" | "sell";
  amountCents: number;
  limitPrice: number;
  status: "open" | "filled" | "cancelled" | "expired" | "rejected";
  createdOn: string;
  expiresOn: string;
  closedOn: string | null;
  note: string | null;
}

const LIMIT_TONE: Record<LimitRow["status"], Tone> = {
  open: "accent",
  filled: "good",
  cancelled: "neutral",
  expired: "neutral",
  rejected: "critical",
};

/** Limit orders with their status; open ones can be cancelled. */
export function LimitOrderList({
  orders,
  showProduct = true,
  empty = "No limit orders.",
}: {
  orders: LimitRow[];
  showProduct?: boolean;
  empty?: string;
}) {
  const { run, pending, error } = useAction();
  if (orders.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <div>
      <ul className="divide-y divide-line">
        {orders.map((o) => (
          <li key={o.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-fg">
                Limit {o.side} {formatUsd(o.amountCents)}
                {showProduct && ` of ${o.productName}`} at {formatPrice(o.limitPrice)}
              </div>
              <div className="truncate text-[11px] text-muted">
                Placed {o.createdOn} ·{" "}
                {o.status === "open" ? `expires ${o.expiresOn}` : `${o.status} ${o.closedOn ?? ""}`}
                {o.note && ` · ${o.note}`}
              </div>
            </div>
            <Badge tone={LIMIT_TONE[o.status]}>{o.status}</Badge>
            {o.status === "open" && (
              <button
                className={buttonClass("ghost", "sm")}
                disabled={pending}
                onClick={() =>
                  run(() => postJson(`/api/limit-orders/${o.id}`, undefined, "DELETE"))
                }
                aria-label={`Cancel limit ${o.side} of ${o.productName}`}
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-xs text-critical">{error}</p>}
    </div>
  );
}
