import type { AgentId } from "@/lib/domain/types";

/** Events streamed to the browser (as NDJSON) while agents work. */
export type DeskEvent =
  | { type: "run_started"; agent: AgentId; runId: string; mode: "claude" | "offline" }
  | { type: "text"; agent: AgentId; delta: string }
  | { type: "tool_call"; agent: AgentId; tool: string; input: unknown }
  | { type: "tool_result"; agent: AgentId; tool: string; ok: boolean; result: unknown }
  | { type: "run_finished"; agent: AgentId; runId: string; summary: string; ok: boolean }
  | { type: "notice"; agent?: AgentId; message: string }
  | { type: "error"; agent?: AgentId; message: string }
  | { type: "done" };
