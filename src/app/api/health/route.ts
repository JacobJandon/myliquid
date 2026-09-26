import { getDb, simDate } from "@/lib/db";
import { isRemoteUrl } from "@/lib/db/remote";
import { agentMode, modelName } from "@/lib/agents/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness and setup check: after a deploy, open /api/health to see what is missing. */
export function GET() {
  try {
    const db = getDb();
    return Response.json({
      ok: true,
      simDate: simDate(db),
      database: isRemoteUrl(db.name) ? "hosted" : "file",
      agentMode: agentMode(),
      model: agentMode() === "claude" ? modelName() : null,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }
}
