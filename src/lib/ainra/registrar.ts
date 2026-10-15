import { ainraMode } from "./index";

/**
 * A live AINRA registrar (AINRA's `registrar-box`), for deployments that issue and revoke real agent identities
 * instead of using the testbed samples. Configure it with:
 * - `AINRA_REGISTRAR_URL`: where the registrar listens (for example `http://registrar:4950`);
 * - `AINRA_REGISTRAR_TOKEN`: its write token (`AINRA_STAGE_ISSUE_TOKEN` on the registrar), kept server-side;
 * - `AINRA_ROOTS_FILE` and `AINRA_DIRECTORY_FILE`: the trust anchors that accredit it, so MyLiquid verifies what
 *   it issues at the real time (configured mode).
 * MyLiquid never trusts the registrar's word about an identity: every presentation it fetches still goes through
 * `checkPassport`, fail closed, like any agent's. `scripts/ainra-live.sh` runs one locally.
 */

export interface RegistrarRecord {
  sub: string;
  iss: string;
  registrar: string;
  tier: string;
  capabilities: string[];
}

export interface RegistrarHealth {
  ok: boolean;
  registrar: string | null;
  records: number;
  network: string | null;
  error: string | null;
}

const TIMEOUT_MS = 10_000;

function config(): { url: string; token: string } | null {
  const url = process.env.AINRA_REGISTRAR_URL?.replace(/\/+$/, "");
  return url ? { url, token: process.env.AINRA_REGISTRAR_TOKEN ?? "" } : null;
}

/** True when MyLiquid issues real identities: a registrar is set and the anchors that accredit it are loaded. */
export function registrarEnabled(): boolean {
  return !!config() && ainraMode() === "configured";
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const cfg = config();
  if (!cfg) throw new Error("No AINRA registrar is configured (AINRA_REGISTRAR_URL).");
  let res: Response;
  try {
    res = await fetch(cfg.url + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(method === "POST" && cfg.token ? { authorization: `Bearer ${cfg.token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    throw new Error(
      `The AINRA registrar didn't answer (${e instanceof Error ? e.message : String(e)}).`,
    );
  }
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? text.slice(0, 200);
    throw new Error(`The AINRA registrar refused: ${msg} (HTTP ${res.status}).`);
  }
  return data as T;
}

export async function registrarHealth(): Promise<RegistrarHealth> {
  try {
    const h = await call<{ ok: boolean; registrar: string; records: number; network: string }>(
      "GET",
      "/health",
    );
    return {
      ok: !!h.ok,
      registrar: h.registrar,
      records: h.records,
      network: h.network,
      error: null,
    };
  } catch (e) {
    return {
      ok: false,
      registrar: null,
      records: 0,
      network: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** An AINRA name label: [a-z0-9-], 1–63 characters, no hyphen at either end. */
export function nameLabel(s: string): string {
  const label = s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63)
    .replace(/-$/, "");
  return label || "agent";
}

export interface IssueRequest {
  operator: string;
  lineage: string;
  tier: "L1" | "L2" | "L3" | "L4";
  capabilities: string[];
  /** Who the operator is accountable to (AINRA's principal proof). */
  principal: string;
}

/** Issues a passport. L3 and L4 carry an audit reference, as AINRA requires for those tiers. */
export async function issueIdentity(req: IssueRequest): Promise<RegistrarRecord> {
  const operator = nameLabel(req.operator);
  const lineage = nameLabel(req.lineage);
  return call<RegistrarRecord>("POST", "/issue", {
    operator,
    lineage,
    version: "1.0.0",
    tier: req.tier,
    auth_class: "A2",
    principal_proof: req.principal,
    capabilities: req.capabilities,
    scope_ceiling: req.capabilities,
    hops: [],
    ...(req.tier === "L3" || req.tier === "L4"
      ? {
          audit: {
            reference: `myliquid-${operator}-${lineage}`,
            expires: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
          },
        }
      : {}),
  });
}

/** A fresh presentation of an issued passport, as its agent would present it now. */
export async function presentIdentity(sub: string): Promise<unknown> {
  return call<unknown>("GET", `/present?sub=${encodeURIComponent(sub)}`);
}

/** Revokes a passport at the registrar. Every later presentation of it says so. */
export async function revokeIdentity(sub: string): Promise<void> {
  await call<unknown>("POST", "/revoke", { sub, now: Math.floor(Date.now() / 1000) });
}
