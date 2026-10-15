import { ainraMode, checkPassport, testbedBundle, type TestbedAgentId } from "@/lib/ainra";
import type { GateIdentity } from "./engine";

/**
 * Turns what an agent presented into the identity Gate decides on. Only a passport that verifies through
 * `lib/ainra` (fail closed) counts; nothing the caller asserts about the agent does.
 */
export function identityFromPassport(passport: unknown, opts: { now?: number } = {}): GateIdentity {
  if (passport === undefined || passport === null)
    return {
      verified: false,
      number: null,
      name: null,
      tier: null,
      capabilities: [],
      reason: "none",
    };
  const check = checkPassport(passport, opts);
  return check.status === "valid"
    ? {
        verified: true,
        number: check.number,
        name: check.name,
        tier: check.tier,
        capabilities: check.capabilities,
        reason: null,
      }
    : {
        verified: false,
        number: check.number,
        name: check.name,
        tier: check.tier,
        capabilities: [],
        reason: check.reason ?? "invalid",
      };
}

/** A testbed agent's passport (TEST-ROOT samples), for trying Gate without a real agent. Testbed mode only. */
export async function samplePassport(id: TestbedAgentId, revoked = false): Promise<unknown | null> {
  if (ainraMode() !== "testbed") return null;
  return testbedBundle(id, { revoked });
}
