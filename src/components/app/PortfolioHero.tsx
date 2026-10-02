"use client";

import clsx from "clsx";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDate, formatPct, formatUsd } from "@/components/format";

export interface ValuePoint {
  date: string;
  /** Cents. */
  value: number;
}

const RANGES = [
  { id: "1W", days: 7, label: "Past week" },
  { id: "1M", days: 30, label: "Past month" },
  { id: "3M", days: 91, label: "Past 3 months" },
  { id: "1Y", days: 366, label: "Past year" },
  { id: "ALL", days: Infinity, label: "All time" },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

const W = 400;
const H = 140;

function daysBetween(a: string, b: string) {
  return (Date.parse(b) - Date.parse(a)) / 86_400_000;
}

/**
 * The phone Home's headline: what the portfolio is worth, how it moved over a range, and a chart you can scrub
 * with a finger to read any day's value.
 */
export function PortfolioHero({
  points,
  cashCents,
}: {
  /** Daily values, oldest first; the last one is today. */
  points: ValuePoint[];
  cashCents: number;
}) {
  const [range, setRange] = useState<RangeId>("1M");
  const [hover, setHover] = useState<number | null>(null);
  const r = RANGES.find((x) => x.id === range)!;

  const shown = useMemo(() => {
    const last = points.at(-1)?.date;
    if (!last) return [];
    const inRange = points.filter((p) => daysBetween(p.date, last) <= r.days);
    return inRange.length > 1 ? inRange : points.slice(-2);
  }, [points, r.days]);

  const first = shown[0]?.value ?? 0;
  const current = shown.at(-1)?.value ?? 0;
  const at = hover !== null ? shown[hover] : shown.at(-1);
  const value = at?.value ?? 0;
  const change = value - first;
  const up = (hover !== null ? change : current - first) >= 0;

  const { path, baseY, x } = useMemo(() => {
    const values = shown.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const xAt = (i: number) => (shown.length > 1 ? (i / (shown.length - 1)) * W : W / 2);
    const yAt = (v: number) => 8 + (1 - (v - min) / span) * (H - 16);
    return {
      path: shown
        .map((p, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`)
        .join(""),
      baseY: yAt(shown[0]?.value ?? min),
      x: xAt,
    };
  }, [shown]);

  const scrub = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    setHover(Math.round(t * (shown.length - 1)));
  };

  return (
    <section aria-label="Portfolio" className="lg:hidden">
      <div className="text-xs font-medium text-muted">Portfolio</div>
      <div className="font-display text-[2.6rem] leading-tight text-fg tabular-nums">
        {formatUsd(value)}
      </div>
      <div className={clsx("text-sm font-medium tabular-nums", up ? "text-good" : "text-critical")}>
        {formatUsd(change, { sign: true })} ({formatPct(first ? change / first : 0, 2, true)}){" "}
        <span className="font-normal text-muted">
          {hover !== null && at ? formatDate(at.date) : r.label}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-3 h-36 w-full touch-none select-none"
        role="img"
        aria-label={`Portfolio value, ${r.label.toLowerCase()}: ${formatUsd(first)} to ${formatUsd(current)}`}
        onPointerDown={scrub}
        onPointerMove={scrub}
        onPointerLeave={() => setHover(null)}
        onPointerUp={(e) => e.pointerType !== "mouse" && setHover(null)}
      >
        <line
          x1={0}
          x2={W}
          y1={baseY}
          y2={baseY}
          stroke="var(--axis)"
          strokeDasharray="2 4"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={path}
          fill="none"
          stroke={up ? "var(--good)" : "var(--critical)"}
          strokeWidth={2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={0}
            y2={H}
            stroke="var(--fg)"
            strokeOpacity={0.35}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      <div className="mt-2 flex justify-between border-b border-line pb-3" role="tablist">
        {RANGES.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={range === x.id}
            onClick={() => {
              setRange(x.id);
              setHover(null);
            }}
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-semibold",
              range === x.id
                ? up
                  ? "bg-good/15 text-good"
                  : "bg-critical/15 text-critical"
                : "text-muted",
            )}
          >
            {x.id}
          </button>
        ))}
      </div>

      <Link
        href="/app/invest"
        className="flex items-center justify-between border-b border-line py-3 text-sm"
      >
        <span className="text-fg">Cash to invest</span>
        <span className="flex items-center gap-1 font-medium text-fg tabular-nums">
          {formatUsd(cashCents)} <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
        </span>
      </Link>
    </section>
  );
}
