"use client";

import clsx from "clsx";
import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ApiKey } from "@/lib/services/apiKeys";
import { postJson, useAction } from "@/components/client";
import { Badge, EmptyState, buttonClass } from "@/components/ui";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-fg-2 hover:bg-surface-3 hover:text-fg"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{" "}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function Snippet({ label, code }: { label: string; code: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-fg-2">{label}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto rounded-xl border border-line bg-bg/70 p-3 text-[11px] leading-relaxed text-fg-2">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function KeyManager({ keys, endpoint }: { keys: ApiKey[]; endpoint: string }) {
  const { run, pending, error } = useAction();
  const [name, setName] = useState("Claude");
  const [trade, setTrade] = useState(false);
  const [pay, setPay] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await run(() =>
      postJson<{ key: string }>("/api/keys", {
        name,
        scopes: ["read", ...(trade ? ["trade"] : []), ...(pay ? ["pay"] : [])],
      }),
    );
    if (res) setCreated(res.key);
  }

  const shownKey = created ?? "mlk_YOUR_KEY";

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 text-sm font-medium text-fg">Create an API key</div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="h-10 w-48 rounded-xl border border-line-strong bg-surface-2 px-3 text-sm text-fg outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Key name"
            maxLength={60}
          />
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={trade}
              onChange={() => setTrade(!trade)}
              className="accent-[var(--accent)]"
            />
            Allow trading (proposals, rebalances, rules)
          </label>
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={pay}
              onChange={() => setPay(!pay)}
              className="accent-[var(--accent)]"
            />
            Allow payments (agent card, within its policy)
          </label>
          <button className={buttonClass("primary")} disabled={pending || !name.trim()}>
            <KeyRound className="h-4 w-4" /> Create key
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Read keys can see your portfolio, liquidity, deals, signals and risk. Trade keys can also
          propose trades and rules. Those still pass Sentinel&apos;s checks and wait for your
          approval unless your autonomy settings allow otherwise. No key can withdraw money or
          change guardrails.
        </p>
        {error && <p className="mt-2 text-xs text-critical">{error}</p>}
        {created && (
          <div className="mt-4 rounded-xl border border-accent/40 bg-accent/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <code className="break-all text-xs text-fg">{created}</code>
              <CopyButton text={created} />
            </div>
            <p className="mt-1 text-[11px] text-fg-2">
              Copy it now. For your security it won&apos;t be shown again.
            </p>
          </div>
        )}
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <Snippet
          label="Claude Code"
          code={`claude mcp add --transport http myliquid ${endpoint} \\\n  --header "Authorization: Bearer ${shownKey}"`}
        />
        <Snippet
          label="MCP client config (JSON)"
          code={JSON.stringify(
            {
              mcpServers: {
                myliquid: {
                  type: "http",
                  url: endpoint,
                  headers: { Authorization: `Bearer ${shownKey}` },
                },
              },
            },
            null,
            2,
          )}
        />
        <Snippet
          label="Test with curl"
          code={`curl -s ${endpoint} \\\n  -H "Authorization: Bearer ${shownKey}" \\\n  -H "Content-Type: application/json" \\\n  -H "Accept: application/json, text/event-stream" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}
        />
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-fg">Your keys</div>
        {keys.length === 0 ? (
          <EmptyState>No keys yet.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className={clsx(
                  "flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4",
                  k.revokedAt && "opacity-50",
                )}
              >
                <KeyRound className="h-4 w-4 text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-fg">{k.name}</div>
                  <div className="font-mono text-[11px] text-muted">
                    {k.prefix}… · created {k.createdAt.slice(0, 10)} ·{" "}
                    {k.lastUsedAt
                      ? `last used ${k.lastUsedAt.slice(0, 16).replace("T", " ")}`
                      : "never used"}
                  </div>
                </div>
                <Badge tone={k.scopes.length > 1 ? "warning" : "neutral"}>
                  {k.scopes.join(" + ")}
                </Badge>
                {k.revokedAt ? (
                  <Badge>revoked</Badge>
                ) : (
                  <button
                    className={buttonClass("ghost", "sm")}
                    disabled={pending}
                    onClick={() => run(() => postJson(`/api/keys/${k.id}`, undefined, "DELETE"))}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
