import { strictB64u, type PresentationBundle } from "@ainra/sdk";
import { tierAutoCeilingCents, declaresTrading } from "@/lib/domain/agentTrading";
import {
  REASON_TEXT,
  ainraMode,
  ainraNow,
  checkPassport,
  parsePassport,
  scopesForTier,
  scopesFromCapabilities,
  testbedBundle,
  type PassportCheck,
  type TestbedAgentId,
} from "./index";

/**
 * How MyLiquid verifies an AINRA passport, shown on a real one (the public /ainra page). It decodes what a
 * presentation carries, can alter a copy the way an attacker or a stale client would, and runs the same
 * `checkPassport` every agent request goes through, so a tampered copy is refused for the reason AINRA gives.
 * Read-only: nothing is stored and nothing leaves MyLiquid.
 */

export const TAMPERS = [
  { id: "none", label: "Present it as issued", expect: null },
  {
    id: "widen",
    label: "Add myliquid:pay to its capabilities",
    expect: "sig_invalid",
    why: "An agent tries to give itself a power its registrar never granted.",
  },
  {
    id: "promote",
    label: "Raise its tier to L4",
    expect: "sig_invalid",
    why: "An agent claims a higher trust tier to get higher limits.",
  },
  {
    id: "quantum",
    label: "Strip the post-quantum signature",
    expect: "alg_downgrade",
    why: "A downgrade to classical-only crypto, so a future quantum computer could forge it.",
  },
  {
    id: "unlogged",
    label: "Point it at another log entry",
    expect: "not_logged",
    why: "A passport issued off the books, outside the registrar's public transparency log.",
  },
  {
    id: "late",
    label: "Present it 10 minutes later",
    expect: "stale_status",
    why: "A replayed or cached presentation whose revocation status is no longer fresh.",
  },
  {
    id: "expired",
    label: "Present it after it expires",
    expect: "expired",
    why: "A passport past its validity window.",
  },
  {
    id: "revoked",
    label: "Its registrar revokes it",
    expect: "revoked",
    why: "The registrar pulled it (only the QuickFox Yield Hunter has a revoked presentation in the testbed).",
  },
] as const;

export type TamperId = (typeof TAMPERS)[number]["id"];
export const TAMPER_IDS = TAMPERS.map((t) => t.id) as [TamperId, ...TamperId[]];

/** The checks a presentation must pass, and the AINRA reasons that fail each one. */
export const STEPS = [
  {
    id: "schema",
    label: "Well-formed AINRA presentation",
    reasons: ["unreadable", "schema_violation", "name_malformed"],
  },
  {
    id: "registrar",
    label: "Issued by a registrar the root accredits",
    detail: "The root-signed directory lists the registrar's keys.",
    reasons: ["unknown_registrar", "registrar_distrusted", "no_trust_anchors"],
  },
  {
    id: "signatures",
    label: "Both signatures verify (Ed25519 and ML-DSA-65)",
    detail: "Hybrid: classical and post-quantum, so breaking one isn't enough.",
    reasons: ["sig_invalid", "alg_downgrade"],
  },
  {
    id: "window",
    label: "Inside its validity window",
    reasons: ["expired", "not_yet_valid"],
  },
  {
    id: "log",
    label: "Recorded in the registrar's transparency log",
    detail: "A Merkle inclusion proof against a signed log checkpoint.",
    reasons: ["not_logged", "checkpoint_invalid"],
  },
  {
    id: "status",
    label: "Not revoked, with fresh status",
    detail: "A signed revocation status list, at most 5 minutes old (freshness F2).",
    reasons: ["revoked", "stale_status"],
  },
  {
    id: "ceiling",
    label: "Within what the registrar may grant",
    reasons: ["ceiling_exceeded", "chain_widening", "chain_expired", "mandate_revoked"],
  },
] as const;

export type StepState = "pass" | "fail" | "unchecked";

const b64uBytes = (s: unknown) => (typeof s === "string" ? Math.floor((s.length * 3) / 4) : 0);

function decodeClaims(bundle: PresentationBundle): Record<string, unknown> {
  try {
    const bytes = strictB64u((bundle as { claims?: string }).claims ?? "");
    return bytes ? (JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function encodeClaims(claims: unknown): string {
  return Buffer.from(JSON.stringify(claims)).toString("base64url");
}

/** A copy of `bundle` altered as `tamper` says, and the moment to verify it at. */
export function tamper(
  bundle: PresentationBundle,
  how: Exclude<TamperId, "revoked">,
  now: number,
): { bundle: PresentationBundle; now: number } {
  const copy = structuredClone(bundle) as unknown as Record<string, unknown> & {
    issuer_sig?: Record<string, unknown>;
  };
  const claims = decodeClaims(bundle) as { capabilities?: string[]; tier?: string; exp?: number };
  switch (how) {
    case "widen":
      copy.claims = encodeClaims({
        ...claims,
        capabilities: [...(claims.capabilities ?? []), "myliquid:pay"],
      });
      break;
    case "promote":
      copy.claims = encodeClaims({ ...claims, tier: "L4" });
      break;
    case "quantum":
      if (copy.issuer_sig) copy.issuer_sig = { ...copy.issuer_sig, mldsa65: "" };
      break;
    case "unlogged":
      copy.leaf_index = Number(copy.leaf_index ?? 0) + 1;
      break;
    case "late":
      return { bundle, now: now + 600 };
    case "expired":
      return { bundle, now: (claims.exp ?? now) + 60 };
  }
  return { bundle: copy as unknown as PresentationBundle, now };
}

/** What a presentation carries, decoded, without the key material. */
export interface Anatomy {
  sub: string | null;
  iss: string | null;
  tier: string | null;
  capabilities: string[];
  scopeCeiling: string[];
  authority: { class: string | null; principal: string | null };
  notBefore: number | null;
  expires: number | null;
  /** Hybrid signature sizes in bytes: classical and post-quantum. */
  signatures: { ed25519: number; mldsa65: number };
  log: { origin: string | null; size: number | null; leaf: number | null; proofHashes: number };
  status: { uri: string | null; issuedAt: number | null; freshness: string | null };
  totalBytes: number;
}

export function anatomy(bundle: PresentationBundle): Anatomy {
  const b = bundle as unknown as Record<string, unknown>;
  const c = decodeClaims(bundle) as Record<string, unknown>;
  const sig = (b.issuer_sig ?? {}) as Record<string, unknown>;
  const cp = (b.checkpoint ?? {}) as Record<string, unknown>;
  const auth = (c.authority ?? {}) as Record<string, unknown>;
  const strs = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  return {
    sub: str(c.sub),
    iss: str(c.iss),
    tier: str(c.tier),
    capabilities: strs(c.capabilities),
    scopeCeiling: strs(c.scope_ceiling),
    authority: { class: str(auth.class), principal: str(auth.principal_proof) },
    notBefore: num(c.nbf),
    expires: num(c.exp),
    signatures: { ed25519: b64uBytes(sig.ed25519), mldsa65: b64uBytes(sig.mldsa65) },
    log: {
      origin: str(cp.origin),
      size: num(cp.size),
      leaf: num(b.leaf_index),
      proofHashes: strs(b.inclusion_proof).length,
    },
    status: {
      uri: str(b.status_uri),
      issuedAt: num(b.status_issued_at),
      freshness: str(b.freshness),
    },
    totalBytes: JSON.stringify(bundle).length,
  };
}

/** What MyLiquid lets a verified agent do: the tier's floor, met with what its passport declares. */
export interface Grant {
  scopes: string[];
  tradesOnItsOwn: boolean;
  /** The most it may trade on its own in one order, whatever the investor allows (cents). */
  autoCeilingCents: number;
  summary: string;
}

export function grantFor(check: PassportCheck): Grant {
  if (check.status !== "valid")
    return {
      scopes: [],
      tradesOnItsOwn: false,
      autoCeilingCents: 0,
      summary:
        "Refused. The key it uses can't act as this agent; without a valid passport an agent only proposes.",
    };
  const byTier = scopesForTier(check.tier);
  const declared = scopesFromCapabilities(check.capabilities) ?? byTier;
  const scopes = byTier.filter((s) => declared.includes(s));
  const ceiling = scopes.includes("trade") ? tierAutoCeilingCents(check.tier) : 0;
  const tradesOnItsOwn = ceiling > 0 && declaresTrading(check.capabilities);
  return {
    scopes,
    tradesOnItsOwn,
    autoCeilingCents: ceiling,
    summary: tradesOnItsOwn
      ? `May read and trade on its own, within the investor's limits and never above its tier's ceiling.`
      : scopes.includes("trade")
        ? "May read; its trades wait for the investor's approval."
        : "May read the account. Anything else it asks for becomes a proposal the investor approves.",
  };
}

export interface Inspection {
  mode: ReturnType<typeof ainraMode>;
  tamper: TamperId;
  anatomy: Anatomy;
  check: PassportCheck;
  explanation: string | null;
  steps: { id: string; label: string; detail: string | null; state: StepState }[];
  grant: Grant;
}

/** Runs the verifier on a presentation (optionally tampered) and explains the result, step by step. */
export function inspect(bundle: PresentationBundle, how: TamperId = "none"): Inspection {
  const base = ainraNow();
  const target =
    how === "none" || how === "revoked" ? { bundle, now: base } : tamper(bundle, how, base);
  const check = checkPassport(target.bundle, { now: target.now });
  const failed = check.reason
    ? STEPS.find((s) => (s.reasons as readonly string[]).includes(check.reason!))?.id
    : null;
  return {
    mode: ainraMode(),
    tamper: how,
    anatomy: anatomy(target.bundle),
    check,
    explanation: check.reason ? (REASON_TEXT[check.reason] ?? check.reason) : null,
    steps: STEPS.map((s) => ({
      id: s.id,
      label: s.label,
      detail: "detail" in s ? s.detail : null,
      // AINRA stops at the first failure; it doesn't say which other checks it got to.
      state: check.status === "valid" ? "pass" : s.id === failed ? "fail" : "unchecked",
    })),
    grant: grantFor(check),
  };
}

/** Inspects a testbed agent's passport (testbed mode only), or any pasted presentation. */
export async function inspectInput(input: {
  sample?: TestbedAgentId;
  passport?: unknown;
  tamper?: TamperId;
}): Promise<Inspection | null> {
  const how = input.tamper ?? "none";
  if (input.sample) {
    if (ainraMode() !== "testbed") return null;
    const revoked = how === "revoked";
    if (revoked && input.sample !== "yield-hunter") return null;
    return inspect(await testbedBundle(input.sample, { revoked }), how);
  }
  const bundle = parsePassport(input.passport);
  if (!bundle) return null;
  return inspect(bundle, how === "revoked" ? "none" : how);
}
