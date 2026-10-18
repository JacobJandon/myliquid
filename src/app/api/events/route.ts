import { z } from "zod";
import { HttpError, handle, parseBody } from "@/lib/api";
import { currentInvestorId } from "@/lib/auth/current";
import { tooManyAttempts } from "@/lib/auth/rateLimit";
import { trackRequest } from "@/lib/analytics/request";
import { CLIENT_EVENTS, type EventName } from "@/lib/domain/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.enum(CLIENT_EVENTS as [EventName, ...EventName[]]),
  props: z
    .record(z.string().max(40), z.union([z.string().max(120), z.number(), z.boolean(), z.null()]))
    .optional(),
});

/** The few events a browser reports itself (page views, clicks). Everything else is recorded server-side. */
export const POST = handle(async (req: Request) => {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "local";
  if (tooManyAttempts(`events:${ip}`, 120, 60_000)) throw new HttpError(429, "Slow down");
  const body = await parseBody(req, Body);
  const props = Object.fromEntries(Object.entries(body.props ?? {}).slice(0, 10));
  trackRequest(req, body.name, await currentInvestorId(), props);
  return new Response(null, { status: 204 });
});
