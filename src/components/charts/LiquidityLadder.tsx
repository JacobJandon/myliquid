"use client";

import { useState } from "react";
import type { LadderBucket } from "@/lib/domain/liquidity";
import { formatDate, formatPct, formatUsd } from "@/components/format";

/**
 * Cumulative liquidity by horizon. One series (share of the portfolio that
 * could be cash by then), so bars use the single accent hue and every bar is
 * direct-labeled. Hover or focus a bar to see what's in it.
 */
export function LiquidityLadder({
  buckets,
  totalCents,
}: {
  buckets: LadderBucket[];
  totalCents: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const current = active !== null ? buckets[active] : null;

  return (
    <div>
      <div className="grid grid-cols-6 items-end gap-2" style={{ height: 170 }}>
        {buckets.map((b, i) => (
          <button
            key={b.id}
            type="button"
            className="group flex h-full flex-col items-center justify-end gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={`${b.label}: ${formatPct(b.cumulativePct)} (${formatUsd(b.cumulativeCents)}) available`}
          >
            <span className="text-xs font-medium text-fg tabular">
              {formatPct(b.cumulativePct, 0)}
            </span>
            <span className="relative w-full max-w-14 flex-1">
              <span
                className="absolute inset-x-0 bottom-0 rounded-t-[4px] transition-opacity"
                style={{
                  height: `${Math.max(b.cumulativePct * 100, 1.5)}%`,
                  background: "var(--accent)",
                  opacity: active === null || active === i ? 0.9 : 0.35,
                }}
              />
            </span>
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-2 border-t border-[var(--axis)] pt-2">
        {buckets.map((b) => (
          <div key={b.id} className="text-center text-[10px] leading-tight text-muted">
            {b.label}
          </div>
        ))}
      </div>
      <div className="mt-4 min-h-[88px] rounded-xl border border-line bg-surface-2/60 p-3 text-xs">
        {current ? (
          <>
            <div className="mb-1.5 flex justify-between text-fg">
              <span className="font-medium">{current.label}</span>
              <span className="tabular">
                +{formatUsd(current.valueCents)} · {formatUsd(current.cumulativeCents)} cumulative
              </span>
            </div>
            {current.items.length === 0 ? (
              <div className="text-muted">Nothing becomes available in this window.</div>
            ) : (
              <ul className="space-y-0.5">
                {current.items.slice(0, 5).map((it, k) => (
                  <li key={k} className="flex justify-between gap-3 text-fg-2">
                    <span className="truncate">
                      {it.label} <span className="text-muted">· {it.note}</span>
                    </span>
                    <span className="shrink-0 tabular">
                      {formatUsd(it.valueCents)} · {formatDate(it.availableOn)}
                    </span>
                  </li>
                ))}
                {current.items.length > 5 && (
                  <li className="text-muted">+{current.items.length - 5} more</li>
                )}
              </ul>
            )}
          </>
        ) : (
          <div className="text-fg-2">
            Of your {formatUsd(totalCents)},{" "}
            <span className="font-medium text-fg">
              {formatUsd(buckets[1]?.cumulativeCents ?? 0)}
            </span>{" "}
            could be cash within 7 days and{" "}
            <span className="font-medium text-fg">
              {formatUsd(buckets[3]?.cumulativeCents ?? 0)}
            </span>{" "}
            within a year. Hover a bar to see what unlocks when.
          </div>
        )}
      </div>
    </div>
  );
}
