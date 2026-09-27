import { z } from "zod";
import { getDb } from "@/lib/db";
import { HttpError, assertSameOrigin } from "@/lib/api";
import { REASON_TEXT, ainraModeLabel } from "@/lib/ainra";
import { tierAutoCeilingCents } from "@/lib/domain/agentTrading";
import { formatUsd } from "@/lib/domain/money";
import { EnrollError, enrollAgent } from "@/lib/services/agentInvites";
import { rateLimited } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  invite: z.string().min(8).max(200),
  ainra_passport: z.unknown(),
  name: z.string().max(60).optional(),
});

/**
 * An outside agent connects itself: it redeems the investor's one-time invite with its AINRA passport and gets
 * back an API key already pinned to its AINRA Number, plus a fresh five-minute presentation window. No session;
 * the invite is the authorization and the passport is the identity.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    assertSameOrigin(req);
  } catch (err) {
    return Response.json(
      { error: err instanceof HttpError ? err.message : "Forbidden" },
      { status: 403 },
    );
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`enroll:${ip}`))
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  let body: z.infer<typeof Body>;
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success)
      return Response.json(
        { error: 'Send JSON: {"invite": "mli_…", "ainra_passport": <bundle or base64url>}' },
        { status: 400 },
      );
    body = parsed.data;
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const db = getDb();
  try {
    const r = enrollAgent(db, body.invite, body.ainra_passport, { name: body.name });
    const origin = new URL(req.url).origin;
    const auto = r.identity.tradeMode === "auto" && r.scopes.includes("trade");
    return Response.json(
      {
        ok: true,
        api_key: r.key,
        key: { id: r.apiKey.id, name: r.apiKey.name },
        identity: {
          name: r.check.name,
          number: r.check.number,
          tier: r.check.tier,
          capabilities: r.check.capabilities,
        },
        scopes: r.scopes,
        trading: auto
          ? {
              mode: "auto",
              per_trade_limit: formatUsd(
                Math.min(r.identity.perTradeLimitCents, tierAutoCeilingCents(r.check.tier)),
              ),
              daily_limit: formatUsd(r.identity.dailyLimitCents),
            }
          : { mode: "propose" },
        mcp: { endpoint: `${origin}/api/mcp`, auth: "Authorization: Bearer <api_key>" },
        presentation: {
          endpoint: `${origin}/api/agent-identity`,
          verified_until: r.verifiedUntil,
          every_seconds: 300,
        },
        trust: ainraModeLabel(),
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof EnrollError)
      return Response.json(
        {
          ok: false,
          error: err.message,
          reason: err.reason,
          explanation: err.reason ? (REASON_TEXT[err.reason] ?? null) : null,
          verdict: err.check?.event ?? null,
          trust: ainraModeLabel(),
        },
        { status: err.status },
      );
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
