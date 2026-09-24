import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, ndjsonStream, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { clearChat, copilotChat, getTranscript } from "@/lib/agents/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ChatBody = z.object({ message: z.string().min(1).max(4000) });

export const GET = handle(async () =>
  json({ transcript: getTranscript(getDb(), await requireApiInvestor()) }),
);

export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const { message } = await parseBody(req, ChatBody);
  return ndjsonStream(req, (emit, signal) => copilotChat(investorId, message, emit, signal));
});

export const DELETE = handle(async () => {
  clearChat(getDb(), await requireApiInvestor());
  return json({ ok: true });
});
