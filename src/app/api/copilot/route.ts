import { z } from "zod";
import { handle, json, ndjsonStream, parseBody } from "@/lib/api";
import { clearChat, copilotChat, getTranscript } from "@/lib/agents/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const maxDuration = 300;

const ChatBody = z.object({ message: z.string().min(1).max(4000) });

export const GET = handle(() => json({ transcript: getTranscript() }));

export const POST = handle(async (req: Request) => {
  const { message } = await parseBody(req, ChatBody);
  return ndjsonStream(req, (emit, signal) => copilotChat(message, emit, signal));
});

export const DELETE = handle(() => {
  clearChat();
  return json({ ok: true });
});
