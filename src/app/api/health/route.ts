import { getDb, simDate } from "@/lib/db";
import { agentMode, modelName } from "@/lib/agents/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const db = getDb();
  return Response.json({
    ok: true,
    simDate: simDate(db),
    agentMode: agentMode(),
    model: agentMode() === "claude" ? modelName() : null,
  });
}
