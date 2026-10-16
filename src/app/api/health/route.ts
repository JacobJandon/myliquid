import { getDb, simDate } from "@/lib/db";
import { isRemoteUrl } from "@/lib/db/remote";
import { agentMode, modelName } from "@/lib/agents/llm";
import { marketClock } from "@/lib/services/sim";
import { priceFeeds, realPricesEnabled } from "@/lib/services/realPrices";

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
      marketClock: marketClock(),
      prices: realPricesEnabled() ? "real" : "simulated",
      priceFeeds: priceFeeds(db).map((f) => ({
        product: f.productId,
        latest: f.latest?.feed ?? null,
      })),
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }
}
