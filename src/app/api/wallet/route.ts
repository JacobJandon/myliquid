import { z } from "zod";
import { getDb } from "@/lib/db";
import { amountUsd, handle, json, parseBody, toCents } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { defundWallet, fundWallet, getWalletBalance } from "@/lib/services/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WalletBody = z.object({ action: z.enum(["fund", "defund"]), amountUsd });

export const GET = handle(async () =>
  json({ balanceCents: getWalletBalance(getDb(), await requireApiInvestor()) }),
);

/** Human-only: moving cash in or out of the agent wallet (the agent's spending ceiling). */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const { action, amountUsd: usd } = await parseBody(req, WalletBody);
  const db = getDb();
  const balanceCents =
    action === "fund"
      ? fundWallet(db, investorId, toCents(usd))
      : defundWallet(db, investorId, toCents(usd));
  return json({ balanceCents });
});
