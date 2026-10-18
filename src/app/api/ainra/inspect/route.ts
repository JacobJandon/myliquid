import { z } from "zod";
import { HttpError, handle, json, parseBody } from "@/lib/api";
import { TESTBED_AGENT_IDS, ainraModeLabel } from "@/lib/ainra";
import { TAMPER_IDS, inspectInput } from "@/lib/ainra/inspect";
import { tooManyAttempts } from "@/lib/auth/rateLimit";
import { trackRequest } from "@/lib/analytics/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  /** One of the testbed agents (testbed mode), or any presentation as an agent would send it. */
  sample: z.enum(TESTBED_AGENT_IDS).optional(),
  passport: z.unknown().optional(),
  tamper: z.enum(TAMPER_IDS).optional(),
});

/**
 * Public: verifies an AINRA presentation, optionally altered first, and explains the verdict (the /ainra page).
 * The same `checkPassport` every agent request goes through. Stores nothing.
 */
export const POST = handle(async (req: Request) => {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "local";
  if (tooManyAttempts(`ainra-inspect:${ip}`, 120, 60_000))
    throw new HttpError(429, "Too many checks; slow down.");
  const body = await parseBody(req, Body);
  if (!body.sample && body.passport === undefined)
    throw new HttpError(400, "Send a sample agent or a passport.");
  const result = await inspectInput(body);
  if (!result)
    throw new HttpError(
      400,
      body.sample
        ? "That sample isn't available here (testbed agents only, and only the yield hunter has a revoked passport)."
        : "That isn't an AINRA presentation (expected JSON or base64url of JSON).",
    );
  trackRequest(req, "ainra_inspected", null, {
    tamper: result.tamper,
    verdict: result.check.reason ?? "valid",
  });
  return json({ ...result, trust: ainraModeLabel() });
});
