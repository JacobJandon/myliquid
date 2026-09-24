import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessage,
  BetaMessageParam,
  BetaTool,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { AgentId } from "@/lib/domain/types";
import { logEvent } from "@/lib/services/audit";
import type { DeskEvent } from "./events";
import { invokeTool, toolInputSchema, type AgentTool, type ToolContext } from "./tools";

/**
 * Claude-powered agent loop: a manual streaming tool-use loop over the platform's
 * own tools. Text streams to the UI as it is generated; every tool call and result
 * is written to the audit log.
 */

export type AgentMode = "claude" | "offline";

const MODEL = process.env.MYLIQUID_MODEL || "claude-opus-5";
const EFFORT = (process.env.MYLIQUID_EFFORT || "medium") as
  "low" | "medium" | "high" | "xhigh" | "max";
const MAX_TURNS = 10;

export function agentMode(): AgentMode {
  const forced = process.env.MYLIQUID_AGENT_MODE;
  if (forced === "offline") return "offline";
  const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  if (forced === "claude") return "claude";
  return hasKey ? "claude" : "offline";
}

export function modelName(): string {
  return MODEL;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

function toApiTool(tool: AgentTool): BetaTool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: toolInputSchema(tool) as BetaTool["input_schema"],
    eager_input_streaming: true,
  };
}

export interface LoopResult {
  /** Every message of the exchange, including the assistant turns, for replaying history. */
  messages: BetaMessageParam[];
  /** New messages appended by this call (assistant turns and tool results). */
  appended: BetaMessageParam[];
  finalText: string;
  stopReason: BetaMessage["stop_reason"];
}

export async function runClaudeLoop(opts: {
  agent: AgentId;
  system: string;
  tools: AgentTool[];
  messages: BetaMessageParam[];
  ctx: ToolContext;
  emit: (event: DeskEvent) => void;
  signal?: AbortSignal;
}): Promise<LoopResult> {
  const { agent, ctx, emit } = opts;
  const apiTools = opts.tools.map(toApiTool);
  const toolIndex = new Map(opts.tools.map((t) => [t.name, t]));
  const messages = [...opts.messages];
  const appended: BetaMessageParam[] = [];
  let finalText = "";
  let stopReason: BetaMessage["stop_reason"] = null;
  let jsonRetries = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = getClient().beta.messages.stream(
      {
        model: MODEL,
        max_tokens: 64000,
        system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
        tools: apiTools,
        messages,
        thinking: { type: "adaptive" },
        output_config: { effort: EFFORT },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { signal: opts.signal },
    );

    let turnText = "";
    stream.on("text", (delta) => {
      turnText += delta;
      emit({ type: "text", agent, delta });
    });

    let message: BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // With eager input streaming, an unparseable tool input rejects finalMessage().
      // Retry that turn a couple of times; API errors are real and propagate.
      if (err instanceof Anthropic.APIError || opts.signal?.aborted || jsonRetries++ >= 2)
        throw err;
      continue;
    }
    stopReason = message.stop_reason;

    if (message.stop_reason === "refusal") {
      const note = "\n\nI can't help with that request.";
      emit({ type: "text", agent, delta: note });
      finalText += turnText + note;
      break;
    }

    const assistantTurn: BetaMessageParam = { role: "assistant", content: message.content };
    messages.push(assistantTurn);
    appended.push(assistantTurn);
    if (turnText) finalText += (finalText ? "\n\n" : "") + turnText;

    const toolUses = message.content.filter((b): b is BetaToolUseBlock => b.type === "tool_use");
    if (message.stop_reason === "pause_turn") continue;
    if (toolUses.length === 0) break;
    if (message.stop_reason === "max_tokens") {
      throw new Error(
        "The agent's response was cut off (max_tokens) before its tool call was complete.",
      );
    }

    // Run every tool call from this turn, then return all results in one user message.
    const results: BetaToolResultBlockParam[] = toolUses.map((use) => {
      const tool = toolIndex.get(use.name);
      emit({ type: "tool_call", agent, tool: use.name, input: use.input });
      if (!tool) {
        return {
          type: "tool_result",
          tool_use_id: use.id,
          is_error: true,
          content: `Unknown tool ${use.name}`,
        };
      }
      const outcome = invokeTool(tool, use.input, ctx);
      logEvent(ctx.db, {
        runId: ctx.runId,
        agent,
        kind: "tool_call",
        title: `${use.name}(${compactJson(use.input)})`,
        payload: { input: use.input, ok: outcome.ok },
      });
      emit({ type: "tool_result", agent, tool: use.name, ok: outcome.ok, result: outcome.result });
      return {
        type: "tool_result",
        tool_use_id: use.id,
        is_error: !outcome.ok,
        content: JSON.stringify(outcome.result),
      };
    });
    const toolTurn: BetaMessageParam = { role: "user", content: results };
    messages.push(toolTurn);
    appended.push(toolTurn);
  }

  return { messages, appended, finalText: finalText.trim(), stopReason };
}

export function compactJson(value: unknown, max = 160): string {
  const s = JSON.stringify(value ?? {});
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function describeApiError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError)
    return "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.";
  if (err instanceof Anthropic.RateLimitError)
    return "Claude is rate limited right now. Try again in a moment.";
  if (err instanceof Anthropic.BadRequestError)
    return `Claude rejected the request: ${err.message}`;
  if (err instanceof Anthropic.APIConnectionError) return "Could not reach the Anthropic API.";
  if (err instanceof Anthropic.APIError)
    return `Claude API error ${err.status ?? ""}: ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}
