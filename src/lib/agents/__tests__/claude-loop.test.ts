import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openDatabase, setDb } from "@/lib/db";
import type { DeskEvent } from "../events";

/**
 * Exercises the Claude-mode loop against a local mock of the Messages streaming API:
 * a tool_use turn, then a final text turn. Verifies the request shape and that tool
 * results are sent back in a single user message.
 */

type Captured = { headers: http.IncomingHttpHeaders; body: Record<string, unknown> };
const requests: Captured[] = [];

function sse(events: Record<string, unknown>[]): string {
  return events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
}

const start = (id: string) => ({
  type: "message_start",
  message: {
    id,
    type: "message",
    role: "assistant",
    model: "claude-opus-5",
    content: [],
    stop_reason: null,
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 1 },
  },
});

let server: http.Server;
const savedEnv = { ...process.env };

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw) as Record<string, unknown>;
      requests.push({ headers: req.headers, body });
      const messages = body.messages as { role: string; content: unknown }[];
      const last = messages[messages.length - 1]!;
      const hasToolResult =
        Array.isArray(last.content) &&
        (last.content as { type: string }[]).some((b) => b.type === "tool_result");
      res.writeHead(200, { "content-type": "text/event-stream" });
      if (!hasToolResult) {
        res.end(
          sse([
            start("msg_1"),
            { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
            {
              type: "content_block_delta",
              index: 0,
              delta: { type: "text_delta", text: "Checking your portfolio." },
            },
            { type: "content_block_stop", index: 0 },
            {
              type: "content_block_start",
              index: 1,
              content_block: { type: "tool_use", id: "toolu_1", name: "get_portfolio", input: {} },
            },
            {
              type: "content_block_delta",
              index: 1,
              delta: { type: "input_json_delta", partial_json: "{}" },
            },
            { type: "content_block_stop", index: 1 },
            {
              type: "message_delta",
              delta: { stop_reason: "tool_use", stop_sequence: null },
              usage: { output_tokens: 12 },
            },
            { type: "message_stop" },
          ]),
        );
      } else {
        res.end(
          sse([
            start("msg_2"),
            { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
            {
              type: "content_block_delta",
              index: 0,
              delta: { type: "text_delta", text: "You hold eight positions." },
            },
            { type: "content_block_stop", index: 0 },
            {
              type: "message_delta",
              delta: { stop_reason: "end_turn", stop_sequence: null },
              usage: { output_tokens: 6 },
            },
            { type: "message_stop" },
          ]),
        );
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_API_KEY = "test-key";
  delete process.env.MYLIQUID_AGENT_MODE;
  setDb(openDatabase(":memory:", { today: "2026-09-24" }));
});

afterAll(() => {
  server.close();
  process.env = savedEnv;
});

describe("Claude agent loop (mock API)", () => {
  it("streams text, runs the tool, and stores the conversation", async () => {
    const { copilotChat, getTranscript } = await import("../runner");
    const events: DeskEvent[] = [];
    await copilotChat("How is my portfolio?", (e) => events.push(e));

    expect(events.find((e) => e.type === "run_started")).toMatchObject({ mode: "claude" });
    expect(events.find((e) => e.type === "tool_call")).toMatchObject({ tool: "get_portfolio" });
    expect(events.find((e) => e.type === "tool_result")).toMatchObject({
      tool: "get_portfolio",
      ok: true,
    });
    expect(
      events
        .filter((e) => e.type === "text")
        .map((e) => (e as { delta: string }).delta)
        .join(""),
    ).toContain("eight positions");

    expect(requests).toHaveLength(2);
    const first = requests[0]!;
    expect(first.body.model).toBe("claude-opus-5");
    expect(first.body.fallbacks).toBe("default");
    expect(first.body.thinking).toEqual({ type: "adaptive" });
    expect(String(first.headers["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
    const tools = first.body.tools as {
      name: string;
      eager_input_streaming?: boolean;
      input_schema: { type: string };
    }[];
    expect(
      tools.every((t) => t.eager_input_streaming === true && t.input_schema.type === "object"),
    ).toBe(true);
    const second = requests[1]!.body.messages as { role: string; content: { type: string }[] }[];
    expect(second.at(-1)!.content.every((b) => b.type === "tool_result")).toBe(true);

    const transcript = getTranscript();
    expect(transcript.map((t) => t.role)).toEqual(["user", "assistant"]);
    expect(transcript[1]!.tools).toEqual(["get_portfolio"]);
    expect(transcript[1]!.text).toContain("eight positions");
  });
});
