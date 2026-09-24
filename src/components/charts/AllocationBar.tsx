import { SLEEVE_LABELS } from "@/lib/domain/catalog";
import { formatPct, formatUsd } from "@/lib/domain/money";
import type { PortfolioSnapshot, Sleeve } from "@/lib/domain/types";
import { SLEEVE_COLORS } from "@/components/ui";

function formatDrift(drift: number): string {
  const pp = Math.round(drift * 1000) / 10;
  if (pp === 0) return "0.0pp";
  return `${pp > 0 ? "+" : ""}${pp.toFixed(1)}pp`;
}

const ORDER: Sleeve[] = ["index", "trading", "bitcoin", "business", "private", "cash"];

/**
 * Composition of the portfolio by sleeve (one stacked bar), with a legend that
 * doubles as the data table: value, weight, target and drift per sleeve.
 */
export function AllocationBar({
  snapshot,
  targets,
}: {
  snapshot: PortfolioSnapshot;
  targets: Record<Sleeve, number>;
}) {
  return (
    <div>
      <div
        className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label="Allocation by sleeve"
      >
        {ORDER.filter((s) => snapshot.sleeves[s].weight > 0.001).map((s) => (
          <div
            key={s}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${snapshot.sleeves[s].weight * 100}%`, background: SLEEVE_COLORS[s] }}
            title={`${SLEEVE_LABELS[s]}: ${formatPct(snapshot.sleeves[s].weight)} (${formatUsd(snapshot.sleeves[s].valueCents)})`}
          />
        ))}
      </div>
      <table className="mt-4 w-full text-sm tabular">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="pb-2 font-normal">Sleeve</th>
            <th className="pb-2 text-right font-normal">Value</th>
            <th className="pb-2 text-right font-normal">Weight</th>
            <th className="pb-2 text-right font-normal">Target</th>
            <th className="pb-2 text-right font-normal">Drift</th>
          </tr>
        </thead>
        <tbody>
          {ORDER.map((s) => {
            const drift = snapshot.sleeves[s].weight - targets[s];
            const off = Math.abs(drift) >= 0.03;
            return (
              <tr key={s} className="border-t border-line">
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: SLEEVE_COLORS[s] }}
                      aria-hidden
                    />
                    <span className="text-fg">{SLEEVE_LABELS[s]}</span>
                  </span>
                </td>
                <td className="py-2 text-right text-fg-2">
                  {formatUsd(snapshot.sleeves[s].valueCents)}
                </td>
                <td className="py-2 text-right text-fg">{formatPct(snapshot.sleeves[s].weight)}</td>
                <td className="py-2 text-right text-muted">{formatPct(targets[s], 0)}</td>
                <td className={`py-2 text-right ${off ? "font-medium text-fg" : "text-muted"}`}>
                  {off ? "⚑ " : ""}
                  {formatDrift(drift)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
