import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { fireTrader, setHostedStatus } from "@/lib/services/hostedTraders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Pause or resume a hosted trader. */
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const investorId = await requireApiInvestor();
  const { id } = await params;
  const { status } = await parseBody(req, z.object({ status: z.enum(["active", "paused"]) }));
  return json({ trader: setHostedStatus(getDb(), investorId, id, status) });
});

/** Let it go: its key is revoked. */
export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const investorId = await requireApiInvestor();
  const { id } = await params;
  fireTrader(getDb(), investorId, id);
  return json({ ok: true });
});
