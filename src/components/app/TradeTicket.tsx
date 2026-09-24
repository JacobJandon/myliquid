"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import type { CheckResult } from "@/lib/domain/types";
import { postJson, useAction } from "@/components/client";
import { formatUsd } from "@/components/format";
import { buttonClass } from "@/components/ui";

interface Preview {
  checks: CheckResult[];
  blocked: boolean;
  price: number;
  estimatedUnits: number;
}

/** Order entry with a live Sentinel pre-trade check as you type. */
export function TradeTicket({
  productId,
  productName,
  sellableCents,
  cashCents,
  minTicketCents,
  canBuy,
  sellLabel = "Sell",
}: {
  productId: string;
  productName: string;
  sellableCents: number;
  cashCents: number;
  minTicketCents: number;
  canBuy: boolean;
  sellLabel?: string;
}) {
  const [side, setSide] = useState<"buy" | "sell">(canBuy ? "buy" : "sell");
  const [amount, setAmount] = useState("");
  const [lastPreview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const { run, pending, error } = useAction();
  const amountUsd = Number(amount);

  useEffect(() => {
    if (!amountUsd || amountUsd <= 0) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/orders/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId, side, amountUsd }),
          signal: ctrl.signal,
        });
        if (res.ok) setPreview((await res.json()) as Preview);
      } catch {
        /* aborted */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [amountUsd, side, productId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await run(() =>
      postJson<{ order: { status: string; checks: CheckResult[] } }>("/api/orders", {
        productId,
        side,
        amountUsd,
      }),
    );
    if (!res) return;
    const { order } = res;
    if (order.status === "rejected") {
      setResult(
        `Blocked by Sentinel: ${order.checks
          .filter((c) => c.status === "block")
          .map((c) => c.detail)
          .join(" ")}`,
      );
    } else {
      setResult(
        order.status === "queued"
          ? "Redemption request queued for the next window."
          : order.status === "settling"
            ? "Sold. Proceeds are settling."
            : `${side === "buy" ? "Bought" : "Sold"} ${formatUsd(Math.round(amountUsd * 100))} of ${productName}.`,
      );
      setAmount("");
    }
  }

  const max = side === "buy" ? cashCents : sellableCents;
  // Only show a preview for the amount currently typed.
  const preview = amountUsd > 0 ? lastPreview : null;

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1 text-sm" role="tablist">
        {(["buy", "sell"] as const).map((s) => (
          <button
            type="button"
            key={s}
            role="tab"
            aria-selected={side === s}
            disabled={s === "buy" && !canBuy}
            onClick={() => setSide(s)}
            className={clsx(
              "h-8 rounded-full capitalize disabled:opacity-40",
              side === s ? "bg-surface-3 text-fg" : "text-muted",
            )}
          >
            {s === "sell" ? sellLabel : "Buy"}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-xs text-muted">Amount (USD)</span>
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-line-strong bg-surface-2 px-3 focus-within:border-accent">
          <span className="text-muted">$</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder={side === "buy" ? (minTicketCents / 100).toLocaleString("en-US") : "0"}
            className="h-11 w-full bg-transparent text-lg text-fg outline-none tabular"
            aria-label="Amount in US dollars"
          />
          <button
            type="button"
            className="text-xs text-accent"
            onClick={() => setAmount(String(Math.floor(max / 100)))}
          >
            Max
          </button>
        </div>
        <span className="mt-1 block text-[11px] text-muted">
          {side === "buy"
            ? `${formatUsd(cashCents)} cash available · minimum ${formatUsd(minTicketCents)}`
            : `${formatUsd(sellableCents)} unlocked`}
        </span>
      </label>

      {preview && (
        <ul
          className="space-y-1 rounded-xl border border-line bg-surface-2/60 p-3 text-xs"
          aria-live="polite"
        >
          {preview.checks.map((c) => (
            <li key={c.id} className="flex gap-2">
              <span
                aria-hidden
                className={clsx(
                  "w-3 shrink-0 font-bold",
                  c.status === "pass" && "text-good",
                  c.status === "warn" && "text-warning",
                  c.status === "block" && "text-critical",
                )}
              >
                {c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "✕"}
              </span>
              <span>
                <span className="text-fg">{c.label}</span>{" "}
                <span className="text-fg-2">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        className={clsx(buttonClass("primary"), "w-full")}
        disabled={pending || !amountUsd || preview?.blocked}
      >
        {preview?.blocked ? "Blocked by Sentinel" : side === "buy" ? "Buy" : sellLabel}
      </button>
      {(result || error) && <p className="text-xs text-fg-2">{error ?? result}</p>}
    </form>
  );
}
