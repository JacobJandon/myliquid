"use client";

import { CalendarClock, FastForward } from "lucide-react";
import { postJson, useAction } from "@/components/client";
import { buttonClass } from "@/components/ui";

interface DayReport {
  date: string;
  events: string[];
}

/** Lets the investor jump the market ahead, where the clock allows it; otherwise says the market follows the calendar. */
export function SimControls({ canAdvance }: { canAdvance: boolean }) {
  const { run, pending, error } = useAction();
  if (!canAdvance)
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-muted"
        title="The market is shared by everyone here, so it follows the calendar: one market day per day."
      >
        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Moves daily</span>
      </span>
    );
  const advance = (days: number) =>
    run(async () => {
      const res = await postJson<{ reports: DayReport[] }>("/api/sim/advance", { days });
      const notable = res.reports.flatMap((r) => r.events.map((e) => `${r.date}: ${e}`));
      if (notable.length) console.info("[MyLiquid market]", notable.join("\n"));
      return res;
    });
  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden text-xs text-muted sm:inline">Advance market</span>
      {[1, 7, 30].map((d) => (
        <button
          key={d}
          className={buttonClass("secondary", "sm")}
          disabled={pending}
          onClick={() => advance(d)}
          title={`Advance the simulated market ${d} day${d > 1 ? "s" : ""}`}
        >
          {d === 1 && <FastForward className="h-3.5 w-3.5" />}+{d}d
        </button>
      ))}
      {error && <span className="text-xs text-critical">{error}</span>}
    </div>
  );
}
