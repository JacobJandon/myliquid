import { getDb } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/apiKeys";
import { identityGate } from "@/lib/services/agentIdentity";
import { getDealFacts } from "@/lib/domain/catalog";
import { x402Purchase, x402Requirements } from "@/lib/services/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A pay-per-call data API in the style of x402. Without payment it answers
 * HTTP 402 with machine-readable payment requirements. With an API key that has
 * the "pay" scope and "X-PAYMENT: myliquid-wallet", the investor's agent card
 * pays the price from the agent wallet (under the card's policy) and the data comes back.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> },
): Promise<Response> {
  const { productId } = await params;
  if (!getDealFacts(productId)) return Response.json({ error: "Unknown deal" }, { status: 404 });
  const resource = new URL(req.url).pathname;
  const payment = req.headers.get("x-payment");
  if (!payment) return Response.json(x402Requirements(resource), { status: 402 });

  const token = req.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]
    ?.trim();
  const db = getDb();
  const principal = authenticateApiKey(db, token);
  const gate = principal ? identityGate(db, principal) : null;
  if (gate && !gate.allow) {
    return Response.json({ ...x402Requirements(resource), error: gate.message }, { status: 402 });
  }
  if (!principal || !gate?.allow || !gate.principal.scopes.includes("pay")) {
    return Response.json(
      { ...x402Requirements(resource), error: "A MyLiquid API key with the pay scope is required" },
      { status: 402 },
    );
  }
  if (payment !== "myliquid-wallet")
    return Response.json(
      { ...x402Requirements(resource), error: "Unsupported payment scheme" },
      { status: 402 },
    );

  const result = x402Purchase(db, principal.investorId, productId, "external");
  if (result.decision !== "approve") {
    return Response.json(
      { ...x402Requirements(resource), error: result.message, paymentId: result.payment.id },
      { status: 402 },
    );
  }
  return Response.json(result.data, {
    status: 200,
    headers: {
      "x-payment-response": JSON.stringify({
        success: true,
        paymentId: result.payment.id,
        amount: "0.50",
        asset: "USD",
      }),
    },
  });
}
