import { z } from "zod";
import { getDb } from "@/lib/db";
import { amountUsd, handle, json, parseBody, toCents } from "@/lib/api";
import { previewOrder } from "@/lib/services/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PreviewBody = z.object({ productId: z.string(), side: z.enum(["buy", "sell"]), amountUsd });

export const POST = handle(async (req: Request) => {
  const body = await parseBody(req, PreviewBody);
  return json(
    previewOrder(
      getDb(),
      { productId: body.productId, side: body.side, amountCents: toCents(body.amountUsd) },
      "user",
    ),
  );
});
