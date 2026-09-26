import { getDb } from "@/lib/db";
import { HttpError, assertSameOrigin } from "@/lib/api";
import { ainraModeLabel } from "@/lib/ainra";
import { authenticateApiKey } from "@/lib/services/apiKeys";
import { presentPassport } from "@/lib/services/agentIdentity";
import { rateLimited } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A connected agent presents its AINRA passport here, authenticated with its MyLiquid API key
 * ("Authorization: Bearer mlk_..."). Send the bundle as {"ainra_passport": <bundle or base64url>} (bundles are
 * tens of KB, too big for most header limits) or in the x-ainra-passport header. A valid passport for the
 * key's pinned AINRA Number lets the key act for the next five minutes.
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
  const db = getDb();
  const token = req.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]
    ?.trim();
  const principal = authenticateApiKey(db, token);
  if (!principal) return Response.json({ error: "Missing or invalid API key" }, { status: 401 });
  if (rateLimited(principal.keyId))
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });

  let passport: unknown = req.headers.get("x-ainra-passport");
  if (!passport) {
    try {
      passport = ((await req.json()) as { ainra_passport?: unknown }).ainra_passport;
    } catch {
      return Response.json(
        { error: "Body must be JSON with an ainra_passport field" },
        { status: 400 },
      );
    }
  }
  const result = presentPassport(db, principal, passport);
  const body = {
    ok: result.ok,
    reason: result.reason,
    verdict: result.check.event,
    verifiedUntil: result.verifiedUntil,
    trust: ainraModeLabel(),
  };
  const status = result.ok ? 200 : result.reason === "not_bound" ? 409 : 403;
  return Response.json(
    result.reason === "not_bound"
      ? {
          ...body,
          error: "Pin this key to an AINRA identity in MyLiquid (Connect an agent) first.",
        }
      : body,
    {
      status,
      headers: result.check.event ? { "x-ainra-verdict": JSON.stringify(result.check.event) } : {},
    },
  );
}
