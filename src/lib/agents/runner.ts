import type {
  BetaContentBlockParam,
  BetaMessageParam,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { getDb, nowIso, simDate, type Db } from "@/lib/db";
import type { AgentId } from "@/lib/domain/types";
import { finishRun, logEvent, startRun } from "@/lib/services/audit";
import { getMandate } from "@/lib/services/repo";
import type { DeskEvent } from "./events";
import { agentMode, describeApiError, runClaudeLoop } from "./llm";
import { offlineCopilot, runOfflineRoutine } from "./offline";
import { AGENTS, DESK_AGENTS, systemPrompt } from "./registry";
import { toolsFor } from "./tools";

type Emit = (event: DeskEvent) => void;

/** Agents that can trade. The kill switch stops them; the watchdogs keep running. */
const TRADING_AGENTS: AgentId[] = ["atlas", "quant"];

export async function runAgentRoutine(
  investorId: string,
  agentId: AgentId,
  trigger: "manual" | "cycle",
  emit: Emit,
  signal?: AbortSignal,
): Promise<{ ok: boolean; summary: string }> {
  const db = getDb();
  const def = AGENTS[agentId];
  const mandate = getMandate(db, investorId);

  if (mandate.disabledAgents.includes(agentId)) {
    emit({ type: "notice", agent: agentId, message: `${def.name} is disabled in Guardrails.` });
    return { ok: false, summary: "Disabled" };
  }
  if (mandate.killSwitch && TRADING_AGENTS.includes(agentId)) {
    emit({ type: "notice", agent: agentId, message: `${def.name} is paused by the kill switch.` });
    return { ok: false, summary: "Paused by kill switch" };
  }

  let mode = agentMode();
  const runId = startRun(db, investorId, agentId, trigger, mode);
  emit({ type: "run_started", agent: agentId, runId, mode });
  const ctx = { db, investorId, agent: agentId, runId };

  let summary = "";
  try {
    if (mode === "claude") {
      try {
        const result = await runClaudeLoop({
          agent: agentId,
          system: systemPrompt(def),
          tools: toolsFor(def.tools),
          messages: [
            {
              role: "user",
              content: `Today's date on the platform is ${simDate(db)}. ${def.routine}`,
            },
          ],
          ctx,
          emit,
          signal,
        });
        summary = result.finalText;
      } catch (err) {
        if (signal?.aborted) throw err;
        // Keep the desk running when Claude is unreachable: fall back to the offline agent.
        emit({
          type: "notice",
          agent: agentId,
          message: `${describeApiError(err)} Running ${def.name} offline instead.`,
        });
        mode = "offline";
      }
    }
    if (mode === "offline") {
      summary = runOfflineRoutine(agentId, ctx, emit);
      emit({ type: "text", agent: agentId, delta: summary });
    }
    finishRun(db, runId, { summary });
    logEvent(db, investorId, {
      runId,
      agent: agentId,
      kind: "run_finished",
      title: `${def.name} finished`,
      payload: { summary },
    });
    emit({ type: "run_finished", agent: agentId, runId, summary, ok: true });
    return { ok: true, summary };
  } catch (err) {
    const message = describeApiError(err);
    finishRun(db, runId, { error: message });
    logEvent(db, investorId, {
      runId,
      agent: agentId,
      kind: "error",
      title: `${def.name} failed: ${message}`,
    });
    emit({ type: "error", agent: agentId, message });
    emit({ type: "run_finished", agent: agentId, runId, summary: message, ok: false });
    return { ok: false, summary: message };
  }
}

/** Runs the whole desk in dependency order: marks first, then diligence, risk, strategy, trading. */
export async function runDeskCycle(
  investorId: string,
  emit: Emit,
  signal?: AbortSignal,
): Promise<void> {
  for (const agent of DESK_AGENTS) {
    if (signal?.aborted) break;
    await runAgentRoutine(investorId, agent, "cycle", emit, signal);
  }
}

// ── Copilot chat ────────────────────────────────────────────────────────────

interface ChatRow {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

function loadHistory(db: Db, investorId: string): BetaMessageParam[] {
  const rows = db
    .prepare("SELECT * FROM chat_messages WHERE investor_id = ? ORDER BY id")
    .all(investorId) as ChatRow[];
  return rows.map((r) => ({
    role: r.role,
    content: JSON.parse(r.content) as BetaMessageParam["content"],
  }));
}

function appendHistory(db: Db, investorId: string, messages: BetaMessageParam[]): void {
  const insert = db.prepare(
    "INSERT INTO chat_messages (investor_id, role, content, created_at) VALUES (?, ?, ?, ?)",
  );
  for (const m of messages) insert.run(investorId, m.role, JSON.stringify(m.content), nowIso());
}

export function clearChat(db: Db, investorId: string): void {
  db.prepare("DELETE FROM chat_messages WHERE investor_id = ?").run(investorId);
}

export interface TranscriptItem {
  id: number;
  role: "user" | "assistant";
  text: string;
  tools: string[];
}

/** A display-friendly view of the stored conversation (tool results are folded into the turn that called them). */
export function getTranscript(db: Db, investorId: string): TranscriptItem[] {
  const rows = db
    .prepare("SELECT * FROM chat_messages WHERE investor_id = ? ORDER BY id")
    .all(investorId) as ChatRow[];
  const items: TranscriptItem[] = [];
  for (const r of rows) {
    const content = JSON.parse(r.content) as string | BetaContentBlockParam[];
    if (typeof content === "string") {
      items.push({ id: r.id, role: r.role, text: content, tools: [] });
      continue;
    }
    const text = content
      .filter((b): b is Extract<BetaContentBlockParam, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n\n");
    const tools = content
      .filter((b) => b.type === "tool_use")
      .map((b) => (b as { name: string }).name);
    if (r.role === "user" && content.every((b) => b.type === "tool_result")) continue;
    const last = items[items.length - 1];
    if (r.role === "assistant" && last?.role === "assistant") {
      last.text = [last.text, text].filter(Boolean).join("\n\n");
      last.tools.push(...tools);
    } else {
      items.push({ id: r.id, role: r.role, text, tools });
    }
  }
  return items;
}

export async function copilotChat(
  investorId: string,
  message: string,
  emit: Emit,
  signal?: AbortSignal,
): Promise<void> {
  const db = getDb();
  const text = message.trim().slice(0, 4000);
  if (!text) return;
  const history = loadHistory(db, investorId);
  const userTurn: BetaMessageParam = { role: "user", content: text };
  appendHistory(db, investorId, [userTurn]);
  logEvent(db, investorId, {
    agent: "user",
    kind: "message",
    title: `Asked Copilot: ${text.slice(0, 200)}`,
  });

  const def = AGENTS.copilot;
  const ctx = { db, investorId, agent: "copilot" as const, runId: null };
  let mode = agentMode();
  emit({ type: "run_started", agent: "copilot", runId: "chat", mode });

  if (mode === "claude") {
    try {
      const result = await runClaudeLoop({
        agent: "copilot",
        system: systemPrompt(def),
        tools: toolsFor(def.tools),
        messages: [...history, userTurn],
        ctx,
        emit,
        signal,
      });
      const appended =
        result.stopReason === "refusal"
          ? [
              {
                role: "assistant",
                content: [
                  { type: "text", text: result.finalText || "I can't help with that request." },
                ],
              } satisfies BetaMessageParam,
            ]
          : result.appended;
      appendHistory(db, investorId, appended);
      emit({
        type: "run_finished",
        agent: "copilot",
        runId: "chat",
        summary: result.finalText,
        ok: true,
      });
      return;
    } catch (err) {
      if (signal?.aborted) return;
      emit({
        type: "notice",
        agent: "copilot",
        message: `${describeApiError(err)} Answering offline instead.`,
      });
      mode = "offline";
    }
  }

  const reply = offlineCopilot(text, ctx, emit);
  emit({ type: "text", agent: "copilot", delta: reply });
  appendHistory(db, investorId, [{ role: "assistant", content: [{ type: "text", text: reply }] }]);
  emit({ type: "run_finished", agent: "copilot", runId: "chat", summary: reply, ok: true });
}
