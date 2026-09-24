import { z } from "zod";
import { getDb } from "@/lib/db";
import { amountUsd, handle, json, parseBody, toCents } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { executeOrder, listOrders } from "@/lib/services/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OrderBody = z.object({ productId: z.string(), side: z.enum(["buy", "sell"]), amountUsd });

export const GET = handle(async () =>
  json({ orders: listOrders(getDb(), await requireApiInvestor()) }),
);

export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const body = await parseBody(req, OrderBody);
  const order = executeOrder(
    getDb(),
    investorId,
    { productId: body.productId, side: body.side, amountCents: toCents(body.amountUsd) },
    "user",
  );
  return json({ order }, order.status === "rejected" ? 422 : 200);
});
