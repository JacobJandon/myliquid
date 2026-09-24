import { getDb } from "@/lib/db";
import { handle, json } from "@/lib/api";
import { resolveAlert } from "@/lib/services/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dismisses (resolves) an alert. */
export const POST = handle(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    resolveAlert(getDb(), id);
    return json({ ok: true });
  },
);
