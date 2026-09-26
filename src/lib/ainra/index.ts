import fs from "node:fs";
import {
  Verifier,
  strictB64u,
  verdictEvent,
  type PresentationBundle,
  type VerdictEvent,
} from "@ainra/sdk";
import type { ApiScope } from "@/lib/services/apiKeys";
import testbedDirectory from "./testbed/directory.json";
import testbedMeta from "./testbed/meta.json";
import testbedRoots from "./testbed/roots.json";

/**
 * AINRA (https://github.com/JacobJandon/ainra) is a neutral root of identity for AI agents: a registrar issues an
 * agent a passport, and anyone verifies it offline with the published `@ainra/sdk`. MyLiquid is a *verifier*:
 * it checks the passports of agents that connect to an investor's account, and pins API keys to an agent's
 * permanent AINRA Number. Verification is local and fails closed; nothing is sent to AINRA.
 *
 * Trust anchors come from `AINRA_ROOTS_FILE` and `AINRA_DIRECTORY_FILE` (JSON, as AINRA publishes them). Without
 * them MyLiquid runs in **testbed** mode on the TEST-ROOT sample artifacts in `./testbed`, verifying at the
 * samples' issue time, and labels every result that way.
 */

export type AinraMode = "testbed" | "configured";

/** How long a verified presentation lets a bound key act: AINRA's default F2 status freshness (5 minutes). */
export const PRESENTATION_WINDOW_SECS = 300;
/** AINRA bundles are tens of KB (post-quantum keys and signatures). Anything far larger is refused unread. */
export const MAX_PASSPORT_BYTES = 256 * 1024;

interface Anchors {
  mode: AinraMode;
  verifier: Verifier | null;
  error: string | null;
}

let cached: Anchors | null = null;

function loadAnchors(): Anchors {
  const rootsFile = process.env.AINRA_ROOTS_FILE;
  const directoryFile = process.env.AINRA_DIRECTORY_FILE;
  const audience = process.env.AINRA_AUDIENCE ?? "";
  const configured = !!(rootsFile && directoryFile);
  try {
    const roots = configured
      ? (JSON.parse(fs.readFileSync(rootsFile!, "utf8")) as {
          root_ed25519: string;
          root_slh: string;
        })
      : testbedRoots;
    const directory = configured
      ? JSON.parse(fs.readFileSync(directoryFile!, "utf8"))
      : testbedDirectory;
    const verifier = Verifier.fromDirectoryB64(
      directory,
      roots.root_ed25519,
      roots.root_slh,
      "F2",
      false,
      audience,
    );
    return {
      mode: configured ? "configured" : "testbed",
      verifier,
      error: verifier ? null : "The AINRA directory is not signed by the configured roots.",
    };
  } catch (err) {
    return {
      mode: configured ? "configured" : "testbed",
      verifier: null,
      error: `Could not load AINRA trust anchors: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function anchors(): Anchors {
  cached ??= loadAnchors();
  return cached;
}

export function ainraMode(): AinraMode {
  return anchors().mode;
}

/** The clock passports are verified against: real time, or the samples' issue time in testbed mode. */
export function ainraNow(): number {
  return anchors().mode === "testbed" ? testbedMeta.now : Math.floor(Date.now() / 1000);
}

export function ainraModeLabel(): string {
  return anchors().mode === "testbed" ? "TESTBED · TEST-ROOT" : "AINRA trust anchors configured";
}

/** The two TEST-ROOT sample presentations, for demos and tests (testbed mode only). */
export async function sampleBundle(kind: "valid" | "revoked"): Promise<PresentationBundle> {
  const mod =
    kind === "valid"
      ? await import("./testbed/bundle-valid.json")
      : await import("./testbed/bundle-revoked.json");
  return (mod.default ?? mod) as PresentationBundle;
}

/** Accepts a bundle as an object, as JSON text, or as base64url of JSON (the `x-ainra-passport` form). */
export function parsePassport(input: unknown): PresentationBundle | null {
  if (input && typeof input === "object") return input as PresentationBundle;
  if (typeof input !== "string") return null;
  const text = input.trim();
  if (!text || text.length > MAX_PASSPORT_BYTES * 2) return null;
  try {
    if (text.startsWith("{")) return JSON.parse(text) as PresentationBundle;
    const bytes = strictB64u(text);
    if (!bytes || bytes.length > MAX_PASSPORT_BYTES) return null;
    return JSON.parse(new TextDecoder().decode(bytes)) as PresentationBundle;
  } catch {
    return null;
  }
}

interface Claims {
  sub?: string;
  iss?: string;
  tier?: string;
  exp?: number;
  capabilities?: string[];
  scope_ceiling?: string[];
}

function readClaims(bundle: PresentationBundle): Claims {
  try {
    const bytes = strictB64u((bundle as { claims?: string }).claims ?? "");
    if (!bytes) return {};
    const c = JSON.parse(new TextDecoder().decode(bytes)) as Claims;
    return typeof c === "object" && c ? c : {};
  } catch {
    return {};
  }
}

export interface PassportCheck {
  status: "valid" | "invalid";
  /** An AINRA reason (`revoked`, `stale_status`, …), or `unreadable` when the input isn't a bundle at all. */
  reason: string | null;
  /** The canonical AINRA verdict event, as every AINRA surface emits it. */
  event: VerdictEvent | null;
  name: string | null;
  number: string | null;
  tier: string | null;
  capabilities: string[];
  expiresAt: number | null;
  mode: AinraMode;
  /** The `now` the verdict was computed at (unix seconds). */
  checkedAt: number;
}

/** Verifies a presented passport locally. Fails closed: anything short of a valid verdict is `invalid`. */
export function checkPassport(input: unknown, opts: { now?: number } = {}): PassportCheck {
  const { mode, verifier, error } = anchors();
  const now = opts.now ?? ainraNow();
  const base = {
    name: null,
    number: null,
    tier: null,
    capabilities: [],
    expiresAt: null,
    mode,
    checkedAt: now,
  };
  const bundle = parsePassport(input);
  if (!bundle) return { ...base, status: "invalid", reason: "unreadable", event: null };
  if (!verifier)
    return { ...base, status: "invalid", reason: error ?? "no_trust_anchors", event: null };
  const verdict = verifier.verify(bundle, now);
  const event = verdictEvent(bundle, verdict, now);
  const claims = readClaims(bundle);
  return {
    status: verdict.verdict,
    reason: verdict.verdict === "valid" ? null : verdict.reason,
    event,
    name: event.name,
    number: event.number,
    tier: event.tier,
    capabilities: Array.isArray(claims.capabilities)
      ? claims.capabilities.filter((c): c is string => typeof c === "string").slice(0, 256)
      : [],
    expiresAt: typeof claims.exp === "number" ? claims.exp : null,
    mode,
    checkedAt: now,
  };
}

/**
 * MyLiquid capabilities an AINRA passport can grant: `myliquid:read`, `myliquid:trade`, `myliquid:pay`, or
 * `myliquid:*`. Returns the scopes granted, or `null` when the passport says nothing about MyLiquid, in which case
 * the API key's own scopes apply unchanged. `read` is always implied by any MyLiquid capability.
 */
export function scopesFromCapabilities(capabilities: string[]): ApiScope[] | null {
  const mine = capabilities.filter((c) => c.startsWith("myliquid:"));
  if (mine.length === 0) return null;
  if (mine.includes("myliquid:*")) return ["read", "trade", "pay"];
  const scopes = new Set<ApiScope>(["read"]);
  if (mine.includes("myliquid:trade")) scopes.add("trade");
  if (mine.includes("myliquid:pay")) scopes.add("pay");
  return [...scopes];
}

/**
 * MyLiquid's tier floor, following the AINRA Standard's tiers: L0–L1 (declared, anchored) may read; L2 (KYB-verified
 * operator, "standard commerce") may also trade; L3–L4 (backed/regulated, "consumer-scale payments") may also pay.
 * Returns the scopes a pinned agent of that tier may use at most.
 */
export function scopesForTier(tier: string | null): ApiScope[] {
  switch (tier) {
    case "L2":
      return ["read", "trade"];
    case "L3":
    case "L4":
      return ["read", "trade", "pay"];
    default:
      return ["read"];
  }
}

/** Human-readable text for AINRA's frozen reasons. */
export const REASON_TEXT: Record<string, string> = {
  revoked: "The passport has been revoked by its registrar.",
  stale_status:
    "The passport's revocation status is not fresh (older than 5 minutes). Present a fresh one.",
  expired: "The passport has expired.",
  not_yet_valid: "The passport is not valid yet.",
  sig_invalid: "A signature does not verify: the passport was altered or forged.",
  alg_downgrade: "Only one of the two required signatures is present.",
  unknown_registrar: "The passport comes from a registrar these trust anchors don't accredit.",
  registrar_distrusted: "The issuing registrar is distrusted.",
  not_logged: "The passport is not in the transparency log.",
  checkpoint_invalid: "The transparency-log checkpoint does not verify.",
  schema_violation: "The bundle is not a well-formed AINRA presentation.",
  name_malformed: "The agent name is malformed.",
  ceiling_exceeded: "The passport claims more than its registrar may grant.",
  chain_widening: "A delegate tried to widen its parent's scope.",
  chain_expired: "A delegation in the chain has expired.",
  mandate_revoked: "A mandate in the passport was revoked.",
  unreadable: "That isn't an AINRA passport (expected JSON or base64url of JSON).",
};
