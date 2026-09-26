import { z } from "zod";
import { getDb } from "@/lib/db";
import { amountUsd, handle, json, parseBody, toCents } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { listLimitOrders, placeLimitOrder } from "@/lib/services/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LimitBody = z.object({
  productId: z.string(),
  side: z.enum(["buy", "sell"]),
  amountUsd,
  limitPrice: z.number().positive().max(100_000_000),
});

export const GET = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const url = new URL(req.url);
  return json({
    orders: listLimitOrders(getDb(), investorId, {
      openOnly: url.searchParams.get("open") === "1",
      productId: url.searchParams.get("productId") ?? undefined,
    }),
  });
});

/** Places a limit order. It fills now if today's price already meets the limit. */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const body = await parseBody(req, LimitBody);
  return json({
    order: placeLimitOrder(getDb(), investorId, {
      productId: body.productId,
      side: body.side,
      amountCents: toCents(body.amountUsd),
      limitPrice: body.limitPrice,
    }),
  });
});
