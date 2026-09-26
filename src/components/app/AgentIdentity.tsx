"use client";

import clsx from "clsx";
import { BadgeCheck, Fingerprint, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { postJson, useAction } from "@/components/client";
import { Badge, buttonClass } from "@/components/ui";

interface Check {
  status: "valid" | "invalid";
  reason: string | null;
  name: string | null;
  number: string | null;
  tier: string | null;
  capabilities: string[];
  expiresAt: number | null;
  checkedAt: number;
}

interface VerifyResponse {
  check: Check;
  explanation: string | null;
  trust: string;
}

export interface IdentitySummary {
  keyId: string;
  ainraNumber: string;
  tier: string | null;
  capabilities: string[];
  requirePassport: boolean;
  verifiedUntil: number | null;
  lastStatus: "valid" | "invalid" | null;
  lastReason: string | null;
}

const utc = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 16).replace("T", " ");

/** Verify an agent's AINRA passport locally, then pin an API key to that agent's identity. */
export function PassportVerifier({
  keys,
  trust,
  testbed,
}: {
  keys: { id: string; name: string }[];
  trust: string;
  testbed: boolean;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [source, setSource] = useState<{ sample?: "valid" | "revoked"; passport?: string } | null>(
    null,
  );
  const [picked, setKeyId] = useState("");
  // Keys can be created after this panel mounts, so fall back to the first one rather than to nothing.
  const keyId = keys.some((k) => k.id === picked) ? picked : (keys[0]?.id ?? "");
  const [bound, setBound] = useState<string | null>(null);
  const { run, pending, error } = useAction();

  async function verify(body: { sample?: "valid" | "revoked"; passport?: string }) {
    setBound(null);
    const res = await run(() => postJson<VerifyResponse>("/api/ainra/verify", body));
    if (res) {
      setResult(res);
      setSource(body);
    }
  }

  const check = result?.check;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge tone={testbed ? "warning" : "good"}>{trust}</Badge>
        <span className="text-muted">
          Verified here, offline, with the published <code>@ainra/sdk</code>. Nothing is sent to
          AINRA.
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Paste the agent's AINRA passport: the presentation bundle as JSON, or base64url of it."
        className="w-full rounded-xl border border-line-strong bg-surface-2 p-3 font-mono text-[11px] text-fg outline-none focus:border-accent"
        aria-label="AINRA passport"
      />
      <div className="flex flex-wrap gap-2">
        <button
          className={buttonClass("primary", "sm")}
          disabled={pending || !text.trim()}
          onClick={() => verify({ passport: text.trim() })}
        >
          <Fingerprint className="h-3.5 w-3.5" /> Verify passport
        </button>
        {testbed && (
          <>
            <button
              className={buttonClass("secondary", "sm")}
              disabled={pending}
              onClick={() => verify({ sample: "valid" })}
            >
              Try the sample passport
            </button>
            <button
              className={buttonClass("ghost", "sm")}
              disabled={pending}
              onClick={() => verify({ sample: "revoked" })}
            >
              Try a revoked one
            </button>
          </>
        )}
      </div>

      {check && (
        <div
          className={clsx(
            "rounded-2xl border p-4",
            check.status === "valid"
              ? "border-good/40 bg-good/5"
              : "border-critical/40 bg-critical/5",
          )}
          role="status"
        >
          <div className="flex items-center gap-2">
            {check.status === "valid" ? (
              <BadgeCheck className="h-5 w-5 text-good" aria-hidden />
            ) : (
              <ShieldAlert className="h-5 w-5 text-critical" aria-hidden />
            )}
            <span className="font-semibold text-fg">
              {check.status === "valid" ? "Valid passport" : `Refused: ${check.reason}`}
            </span>
            {check.tier && <Badge>{check.tier}</Badge>}
          </div>
          {result?.explanation && <p className="mt-1 text-sm text-fg-2">{result.explanation}</p>}
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted">Agent</dt>
              <dd className="break-all font-mono text-fg">{check.name ?? "unknown"}</dd>
            </div>
            <div>
              <dt className="text-muted">AINRA Number (permanent)</dt>
              <dd className="break-all font-mono text-fg">{check.number ?? "unknown"}</dd>
            </div>
            <div>
              <dt className="text-muted">What it may do</dt>
              <dd className="text-fg">
                {check.capabilities.length ? check.capabilities.join(", ") : "nothing declared"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Checked at</dt>
              <dd className="text-fg">
                {utc(check.checkedAt)} UTC{testbed && " (the samples' issue time)"}
              </dd>
            </div>
          </dl>
          {check.status === "valid" && keys.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <span className="text-xs text-fg-2">Pin this identity to</span>
              <select
                className="h-8 rounded-lg border border-line-strong bg-surface px-2 text-xs"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                aria-label="API key to pin"
              >
                {keys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
              <button
                className={buttonClass("primary", "sm")}
                disabled={pending || !keyId || !source}
                onClick={async () => {
                  const res = await run(() =>
                    postJson(`/api/keys/${keyId}/identity`, source ?? undefined),
                  );
                  if (res) setBound(keys.find((k) => k.id === keyId)?.name ?? "the key");
                }}
              >
                Pin to key
              </button>
              {bound && (
                <span className="text-xs text-good">
                  Pinned to “{bound}”. It now needs this passport to act.
                </span>
              )}
            </div>
          )}
          {check.status === "valid" && keys.length === 0 && (
            <p className="mt-3 text-xs text-muted">Create an API key above to pin this identity.</p>
          )}
        </div>
      )}
      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  );
}

/** The AINRA line under an API key: who it's pinned to, and whether the agent has presented recently. */
export function KeyIdentityLine({ identity, now }: { identity: IdentitySummary; now: number }) {
  const { run, pending } = useAction();
  const live = identity.verifiedUntil !== null && identity.verifiedUntil > now;
  return (
    <div className="mt-2 flex w-full flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-[11px]">
      <Fingerprint className="h-3.5 w-3.5 text-accent" aria-hidden />
      <span className="font-mono text-fg">{identity.ainraNumber}</span>
      {identity.tier && <Badge>{identity.tier}</Badge>}
      {identity.requirePassport ? (
        live ? (
          <Badge tone="good">
            passport valid until {utc(identity.verifiedUntil!).slice(11)} UTC
          </Badge>
        ) : identity.lastStatus === "invalid" ? (
          <Badge tone="critical">blocked: {identity.lastReason}</Badge>
        ) : (
          <Badge tone="warning">waiting for a fresh passport</Badge>
        )
      ) : (
        <Badge>passport not required</Badge>
      )}
      <span className="ml-auto flex gap-1">
        <button
          className={buttonClass("ghost", "sm")}
          disabled={pending}
          onClick={() =>
            run(() =>
              postJson(
                `/api/keys/${identity.keyId}/identity`,
                { requirePassport: !identity.requirePassport },
                "PATCH",
              ),
            )
          }
        >
          {identity.requirePassport ? "Don't require" : "Require passport"}
        </button>
        <button
          className={buttonClass("ghost", "sm")}
          disabled={pending}
          onClick={() =>
            run(() => postJson(`/api/keys/${identity.keyId}/identity`, undefined, "DELETE"))
          }
        >
          Unpin
        </button>
      </span>
    </div>
  );
}
