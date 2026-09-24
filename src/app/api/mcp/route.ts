import { getDb } from "@/lib/db";
import { HttpError, assertSameOrigin } from "@/lib/api";
import { authenticateApiKey } from "@/lib/services/apiKeys";
import { ensureMarketCurrent } from "@/lib/services/sim";
import { handleMcpRequest, rateLimited } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function jsonRpcError(
  status: number,
  message: string,
  headers: Record<string, string> = {},
): Response {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message }, id: null },
    { status, headers },
  );
}

/**
 * MCP endpoint (Streamable HTTP, stateless, JSON responses).
 * Authenticate with "Authorization: Bearer mlk_..." (create keys under Connect).
 */
export async function POST(req: Request): Promise<Response> {
  try {
    assertSameOrigin(req);
  } catch (err) {
    return jsonRpcError(403, err instanceof HttpError ? err.message : "Forbidden");
  }
  const db = getDb();
  const token = req.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]
    ?.trim();
  const principal = authenticateApiKey(db, token);
  if (!principal) {
    return jsonRpcError(401, "Missing or invalid API key. Create one in MyLiquid under Connect.", {
      "www-authenticate": 'Bearer realm="myliquid"',
    });
  }
  if (rateLimited(principal.keyId))
    return jsonRpcError(429, "Rate limit exceeded (120 requests per minute).");
  ensureMarketCurrent(db);
  return handleMcpRequest(req, db, principal);
}

function methodNotAllowed(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed. This server is stateless: POST JSON-RPC requests.",
      },
      id: null,
    }),
    {
      status: 405,
      headers: { allow: "POST", "content-type": "application/json" },
    },
  );
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
