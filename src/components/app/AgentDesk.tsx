"use client";

import clsx from "clsx";
import { Loader2, Play, PlayCircle, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { DeskEvent } from "@/lib/agents/events";
import type { AgentId } from "@/lib/domain/types";
import { streamDesk } from "@/components/client";
import { Markdown } from "@/components/Markdown";
import { AgentAvatar, Badge, buttonClass } from "@/components/ui";

export interface DeskAgentCard {
  id: AgentId;
  name: string;
  role: string;
  summary: string;
  cannot: string[];
  tools: string[];
  lastRun: { summary: string | null; simDate: string; mode: string; status: string } | null;
  paused: boolean;
}

interface LiveRun {
  agent: AgentId;
  mode: string;
  text: string;
  tools: { tool: string; ok?: boolean }[];
  done: boolean;
  ok: boolean;
}

export function AgentDesk({
  agents,
  killSwitch,
}: {
  agents: DeskAgentCard[];
  killSwitch: boolean;
}) {
  const router = useRouter();
  const [runs, setRuns] = useState<LiveRun[]>([]);
  const [running, setRunning] = useState<AgentId | "cycle" | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const abort = useRef<AbortController | null>(null);

  function onEvent(e: DeskEvent) {
    // Immutable updates: React may call updaters twice in development.
    setRuns((prev) => {
      if (e.type === "run_started") {
        return [
          ...prev,
          { agent: e.agent, mode: e.mode, text: "", tools: [], done: false, ok: true },
        ];
      }
      if (!("agent" in e) || !e.agent) return prev;
      let idx = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (!prev[i]!.done && prev[i]!.agent === e.agent) {
          idx = i;
          break;
        }
      }
      if (idx < 0) return prev;
      const cur = prev[idx]!;
      let updated: LiveRun = cur;
      switch (e.type) {
        case "text":
          updated = { ...cur, text: cur.text + e.delta };
          break;
        case "tool_call":
          updated = { ...cur, tools: [...cur.tools, { tool: e.tool }] };
          break;
        case "tool_result": {
          let ti = -1;
          for (let i = cur.tools.length - 1; i >= 0; i--) {
            if (cur.tools[i]!.tool === e.tool && cur.tools[i]!.ok === undefined) {
              ti = i;
              break;
            }
          }
          if (ti >= 0)
            updated = {
              ...cur,
              tools: cur.tools.map((t, i) => (i === ti ? { ...t, ok: e.ok } : t)),
            };
          break;
        }
        case "run_finished":
          updated = { ...cur, done: true, ok: e.ok, text: cur.text || e.summary };
          break;
        default:
          return prev;
      }
      return prev.map((r, i) => (i === idx ? updated : r));
    });
    if (e.type === "notice" || e.type === "error") setNotices((n) => [...n, e.message]);
  }

  async function start(target: AgentId | "cycle") {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setRuns([]);
    setNotices([]);
    setRunning(target);
    try {
      await streamDesk(
        target === "cycle" ? "/api/agents/cycle" : `/api/agents/${target}/run`,
        {},
        onEvent,
        ctrl.signal,
      );
    } catch (err) {
      if (!ctrl.signal.aborted)
        setNotices((n) => [...n, err instanceof Error ? err.message : String(err)]);
    } finally {
      setRunning(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/80 p-4">
        <div>
          <div className="text-sm font-medium text-fg">Run the whole desk</div>
          <div className="text-xs text-muted">
            Ledger marks the book → Scout screens deals → Sentinel checks limits → Atlas proposes →
            Quant watches signals.
          </div>
        </div>
        <button
          className={buttonClass("primary")}
          onClick={() => start("cycle")}
          disabled={running !== null}
        >
          {running === "cycle" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}
          Run desk cycle
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => {
          const live = runs.findLast((r) => r.agent === a.id);
          return (
            <article
              key={a.id}
              className="flex flex-col rounded-2xl border border-line bg-surface/80 p-5"
            >
              <header className="flex items-start gap-3">
                <AgentAvatar agent={a.id} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-fg">{a.name}</h3>
                    {live && !live.done ? (
                      <Badge tone="accent">
                        <span className="animate-pulse-dot">Working</span>
                      </Badge>
                    ) : a.paused ? (
                      <Badge tone="critical">Paused</Badge>
                    ) : (
                      <Badge tone="good">Ready</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted">{a.role}</div>
                </div>
                <button
                  className={buttonClass("secondary", "sm")}
                  onClick={() => start(a.id)}
                  disabled={running !== null || a.paused}
                  aria-label={`Run ${a.name}`}
                >
                  {running === a.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Run
                </button>
              </header>
              <p className="mt-3 text-sm text-fg-2">{a.summary}</p>

              <div className="mt-4 flex-1 rounded-xl border border-line bg-surface-2/60 p-3">
                {live ? (
                  <>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {live.tools.map((t, i) => (
                        <span
                          key={i}
                          className={clsx(
                            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px]",
                            t.ok === false
                              ? "border-critical/50 text-fg"
                              : "border-line-strong text-fg-2",
                          )}
                        >
                          <Wrench className="h-3 w-3" aria-hidden /> {t.tool}
                          {t.ok === undefined ? "…" : t.ok ? "" : " ✕"}
                        </span>
                      ))}
                    </div>
                    {live.text ? (
                      <Markdown>{live.text}</Markdown>
                    ) : (
                      <div className="text-xs text-muted">Thinking…</div>
                    )}
                    <div className="mt-2 text-[10px] text-muted">
                      {live.mode === "claude" ? "Claude" : "Offline"} mode · live
                    </div>
                  </>
                ) : a.lastRun?.summary ? (
                  <>
                    <Markdown>{a.lastRun.summary}</Markdown>
                    <div className="mt-2 text-[10px] text-muted">
                      Last digest · {a.lastRun.simDate} ·{" "}
                      {a.lastRun.mode === "claude" ? "Claude" : "Offline"} mode
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted">
                    No digest yet. Run {a.name} to see its first report.
                  </div>
                )}
              </div>

              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-muted hover:text-fg">
                  Tools & limits
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {a.tools.map((t) => (
                      <code
                        key={t}
                        className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-fg-2"
                      >
                        {t}
                      </code>
                    ))}
                  </div>
                  <ul className="list-disc space-y-0.5 pl-4 text-fg-2">
                    {a.cannot.map((c) => (
                      <li key={c}>Cannot: {c}</li>
                    ))}
                  </ul>
                </div>
              </details>
            </article>
          );
        })}
      </div>

      {(notices.length > 0 || killSwitch) && (
        <div className="space-y-1 rounded-xl border border-warning/40 p-3 text-xs text-fg-2">
          {killSwitch && (
            <div>
              The kill switch is on: Atlas and Quant are paused. The watchdogs (Ledger, Scout,
              Sentinel) keep running.
            </div>
          )}
          {notices.map((n, i) => (
            <div key={i}>{n}</div>
          ))}
        </div>
      )}
    </div>
  );
}
