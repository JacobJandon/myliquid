import { z } from "zod";
import { getDb } from "@/lib/db";
import { HttpError, amountUsd, handle, json, parseBody, toCents } from "@/lib/api";
import { tooManyAttempts } from "@/lib/auth/rateLimit";
import { createPaymentRequest, listOpenRequests } from "@/lib/services/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestBody = z.object({
  merchantId: z.string().max(40),
  amountUsd,
  description: z.string().max(80).optional(),
});

/**
 * Merchant terminal (demo): creates a payment request with a short code that a
 * customer's agent can tap to pay. Public, rate-limited per IP.
 */
export const POST = handle(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooManyAttempts(`terminal:${ip}`, 40, 10 * 60_000))
    throw new HttpError(429, "Too many charges from this terminal. Wait a few minutes.");
  const body = await parseBody(req, RequestBody);
  const request = createPaymentRequest(getDb(), {
    merchantId: body.merchantId,
    amountCents: toCents(body.amountUsd),
    description: body.description,
  });
  return json({ request });
});

export const GET = handle(() => json({ requests: listOpenRequests(getDb()) }));
