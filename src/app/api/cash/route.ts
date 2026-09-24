import { z } from "zod";
import { getDb } from "@/lib/db";
import { amountUsd, handle, json, parseBody, toCents } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { deposit, withdraw } from "@/lib/services/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CashBody = z.object({ action: z.enum(["deposit", "withdraw"]), amountUsd });

/** Human-only endpoint (session cookie required). No agent tool or API key can reach it. */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const body = await parseBody(req, CashBody);
  const db = getDb();
  const movement =
    body.action === "deposit"
      ? deposit(db, investorId, toCents(body.amountUsd))
      : withdraw(db, investorId, toCents(body.amountUsd));
  return json({ movement });
});
