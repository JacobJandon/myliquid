"use client";

import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDate, formatPct, formatPrice, formatUsd } from "@/components/format";

export interface LinePoint {
  date: string;
  value: number;
}

type ValueFormat = "cents" | "price";

const RANGES = [
  { id: "1M", days: 30 },
  { id: "3M", days: 90 },
  { id: "6M", days: 182 },
  { id: "1Y", days: 366 },
] as const;

function fmt(v: number, format: ValueFormat, compact = false) {
  return format === "cents"
    ? formatUsd(v, { compact })
    : compact && v >= 10_000
      ? `$${(v / 1000).toFixed(0)}K`
      : formatPrice(v);
}

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || Math.abs(max) || 1;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? step0;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) ticks.push(t);
  return ticks;
}

/**
 * Single-series line chart with a range filter and a crosshair tooltip.
 * One series, so no legend: the card title names it.
 */
export function LineChart({
  points,
  format = "cents",
  height = 240,
  defaultRange = "1Y",
  stepped = false,
  label,
}: {
  points: LinePoint[];
  format?: ValueFormat;
  height?: number;
  defaultRange?: (typeof RANGES)[number]["id"];
  stepped?: boolean;
  label: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [range, setRange] = useState<string>(defaultRange);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(
      ([entry]) => entry && setWidth(Math.max(280, entry.contentRect.width)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)?.days ?? 366;
    const last = points[points.length - 1];
    if (!last) return [];
    const cutoff = new Date(Date.parse(`${last.date}T00:00:00Z`) - days * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return points.filter((p) => p.date >= cutoff);
  }, [points, range]);

  const pad = { top: 12, right: 12, bottom: 26, left: 58 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = (rawMax - rawMin) * 0.08 || Math.abs(rawMax) * 0.02 || 1;
  const yMin = rawMin - padding;
  const yMax = rawMax + padding;
  const x = (i: number) =>
    pad.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

  const path = data
    .map((d, i) => {
      if (i === 0) return `M${x(0)},${y(d.value)}`;
      return stepped ? `H${x(i)}V${y(d.value)}` : `L${x(i)},${y(d.value)}`;
    })
    .join("");
  const area = data.length ? `${path}V${pad.top + innerH}H${x(0)}Z` : "";
  const ticks = data.length ? niceTicks(yMin, yMax) : [];
  const xTickIdx =
    data.length > 1 ? [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (data.length - 1))) : [];

  const first = data[0];
  const last = data[data.length - 1];
  const change = first && last && first.value ? last.value / first.value - 1 : 0;
  const h = hover !== null ? data[hover] : null;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - pad.left;
    const i = Math.round((px / innerW) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  if (points.length < 2) {
    return (
      <div
        ref={wrap}
        className="flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-line text-center text-sm text-muted"
      >
        History starts today. Advance the market to watch the value move.
      </div>
    );
  }

  return (
    <div ref={wrap} className="w-full overflow-hidden">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-fg-2">
          <span className={clsx("font-medium", change >= 0 ? "text-fg" : "text-fg")}>
            {formatPct(change, 2, true)}
          </span>{" "}
          <span className="text-muted">over the selected range</span>
        </div>
        <div className="flex gap-1" role="group" aria-label={`${label} range`}>
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={clsx(
                "h-7 rounded-full px-2.5 text-xs",
                range === r.id ? "bg-surface-3 text-fg" : "text-muted hover:text-fg",
              )}
              aria-pressed={range === r.id}
            >
              {r.id}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${label}: ${first ? fmt(first.value, format) : ""} to ${last ? fmt(last.value, format) : ""}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          className="block touch-none select-none"
        >
          <defs>
            <linearGradient id="lc-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
              <text
                x={pad.left - 8}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-[var(--muted)] text-[10px] tabular"
              >
                {fmt(t, format, true)}
              </text>
            </g>
          ))}
          {xTickIdx.map((i, k) => (
            <text
              key={`${i}-${k}`}
              x={x(i)}
              y={height - 8}
              textAnchor={k === 0 ? "start" : k === xTickIdx.length - 1 ? "end" : "middle"}
              className="fill-[var(--muted)] text-[10px]"
            >
              {data[i] ? formatDate(data[i].date).replace(/, \d{4}$/, "") : ""}
            </text>
          ))}
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + innerH}
            y2={pad.top + innerH}
            stroke="var(--axis)"
          />
          <path d={area} fill="url(#lc-fill)" />
          <path
            d={path}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {h && hover !== null && (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={pad.top}
                y2={pad.top + innerH}
                stroke="var(--line-strong)"
              />
              <circle
                cx={x(hover)}
                cy={y(h.value)}
                r={4.5}
                fill="var(--accent)"
                stroke="var(--surface)"
                strokeWidth={2}
              />
            </g>
          )}
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-xs shadow-xl"
            style={{ left: Math.min(Math.max(x(hover) - 70, 0), width - 150), width: 140 }}
          >
            <div className="text-muted">{formatDate(h.date)}</div>
            <div className="mt-0.5 font-semibold text-fg tabular">{fmt(h.value, format)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
