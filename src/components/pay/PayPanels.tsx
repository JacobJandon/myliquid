"use client";

import clsx from "clsx";
import { Check, Loader2, Nfc, Snowflake, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORY_LABELS, type MerchantCategory } from "@/lib/domain/payments";
import type { AgentCard, Payment, PaymentRequest } from "@/lib/services/payments";
import { postJson, useAction } from "@/components/client";
import { formatUsd } from "@/components/format";
import { Badge, EmptyState, buttonClass } from "@/components/ui";

const input =
  "h-10 w-full rounded-full border border-line-strong bg-surface px-4 text-sm text-fg outline-none placeholder:text-muted focus:border-fg tabular";

export function WalletPanel({
  walletCents,
  cashCents,
}: {
  walletCents: number;
  cashCents: number;
}) {
  const [amount, setAmount] = useState("50");
  const { run, pending, error } = useAction();
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-muted">Agent wallet</div>
          <div className="font-display text-3xl text-fg tabular">{formatUsd(walletCents)}</div>
        </div>
        <div className="text-right text-xs text-muted">
          {formatUsd(cashCents)} cash available to move
        </div>
      </div>
      <div className="flex gap-2">
        <input
          className={input}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          aria-label="Amount"
        />
        <button
          className={buttonClass("primary")}
          disabled={pending || !Number(amount)}
          onClick={() =>
            run(() => postJson("/api/wallet", { action: "fund", amountUsd: Number(amount) }))
          }
        >
          Top up
        </button>
        <button
          className={buttonClass("secondary")}
          disabled={pending || !Number(amount)}
          onClick={() =>
            run(() => postJson("/api/wallet", { action: "defund", amountUsd: Number(amount) }))
          }
        >
          Withdraw
        </button>
      </div>
      <p className="text-[11px] text-muted">
        The wallet is the hard ceiling on what your agent can spend. Only you can top it up.
      </p>
      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  );
}

export function TapToPay({ nearby }: { nearby: PaymentRequest[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ decision: string; message: string } | null>(null);

  async function tap(c: string) {
    setBusy(c);
    setResult(null);
    try {
      const res = await postJson<{ decision: string; message: string }>("/api/pay/tap", {
        code: c,
      });
      setResult(res);
      setCode("");
    } catch (err) {
      setResult({ decision: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) void tap(code.trim());
        }}
      >
        <input
          className={clsx(
            input,
            "font-mono uppercase placeholder:font-sans placeholder:normal-case",
          )}
          placeholder="Code, e.g. LQ-7K2X"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label="Terminal code"
        />
        <button className={buttonClass("accent")} disabled={!code.trim() || busy !== null}>
          {busy === code.trim() ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Nfc className="h-4 w-4" />
          )}{" "}
          Tap
        </button>
      </form>
      {result && (
        <div
          className={clsx(
            "rounded-2xl border-2 px-4 py-3 text-sm",
            result.decision === "approve"
              ? "border-good bg-good/10"
              : result.decision === "needs_approval"
                ? "border-warning bg-warning/10"
                : "border-critical bg-critical/10",
          )}
          role="status"
        >
          {result.message}
        </div>
      )}
      <div>
        <div className="mb-2 text-xs text-muted">Terminals nearby</div>
        {nearby.length === 0 ? (
          <EmptyState>
            No terminal is waiting.{" "}
            <a href="/terminal" target="_blank" className="font-medium text-fg underline">
              Open a merchant terminal
            </a>{" "}
            to ring something up.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {nearby.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3 py-2"
              >
                <span className="text-xl" aria-hidden>
                  {r.merchantIcon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-fg">{r.merchantName}</div>
                  <div className="truncate font-mono text-[11px] text-muted">
                    {r.code} · {r.description}
                  </div>
                </div>
                <span className="font-semibold tabular">{formatUsd(r.amountCents)}</span>
                <button
                  className={buttonClass("primary", "sm")}
                  disabled={busy !== null}
                  onClick={() => tap(r.code)}
                >
                  {busy === r.code ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Nfc className="h-3.5 w-3.5" />
                  )}{" "}
                  Pay
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function PaymentApprovals({ pending }: { pending: Payment[] }) {
  const { run, pending: busy } = useAction();
  if (pending.length === 0) return <EmptyState>Nothing is waiting for your OK.</EmptyState>;
  return (
    <ul className="space-y-2">
      {pending.map((p) => (
        <li key={p.id} className="rounded-2xl border-2 border-warning bg-warning/10 p-3">
          <div className="flex items-center gap-3">
            <span className="text-xl" aria-hidden>
              {p.merchantIcon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-fg">
                {formatUsd(p.amountCents)} at {p.merchantName}
              </div>
              <div className="text-[11px] text-fg-2">
                {p.checks
                  .filter((c) => c.status === "warn")
                  .map((c) => c.detail)
                  .join(" ")}
              </div>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              className={buttonClass("primary", "sm")}
              disabled={busy}
              onClick={() => run(() => postJson(`/api/payments/${p.id}`, { action: "approve" }))}
            >
              <Check className="h-3.5 w-3.5" /> Approve
            </button>
            <button
              className={buttonClass("ghost", "sm")}
              disabled={busy}
              onClick={() => run(() => postJson(`/api/payments/${p.id}`, { action: "decline" }))}
            >
              <X className="h-3.5 w-3.5" /> Decline
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CardControls({ card }: { card: AgentCard }) {
  const { run, pending, error } = useAction();
  const [form, setForm] = useState({
    approval: card.approvalThresholdCents / 100,
    perPayment: card.perPaymentLimitCents / 100,
    daily: card.dailyLimitCents / 100,
    monthly: card.monthlyLimitCents / 100,
    categories: card.allowedCategories as string[],
  });
  const [saved, setSaved] = useState(false);
  const frozen = card.status === "frozen";

  const num = (key: "approval" | "perPayment" | "daily" | "monthly", label: string) => (
    <label className="block">
      <span className="text-[11px] text-fg-2">{label}</span>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
          $
        </span>
        <input
          type="number"
          min={0}
          className={clsx(input, "pl-7")}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
        />
      </div>
    </label>
  );

  return (
    <div className="space-y-4">
      <button
        className={buttonClass(frozen ? "primary" : "secondary", "sm")}
        disabled={pending}
        onClick={() =>
          run(() => postJson("/api/card", { status: frozen ? "active" : "frozen" }, "PATCH"))
        }
      >
        <Snowflake className="h-3.5 w-3.5" /> {frozen ? "Unfreeze card" : "Freeze card"}
      </button>
      <div className="grid grid-cols-2 gap-3">
        {num("approval", "Auto-pay up to")}
        {num("perPayment", "Max per payment")}
        {num("daily", "Daily limit")}
        {num("monthly", "Monthly limit")}
      </div>
      <div>
        <div className="mb-1.5 text-[11px] text-fg-2">Allowed merchant categories</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_LABELS) as MerchantCategory[]).map((c) => {
            const on = form.categories.includes(c);
            return (
              <button
                type="button"
                key={c}
                onClick={() =>
                  setForm({
                    ...form,
                    categories: on
                      ? form.categories.filter((x) => x !== c)
                      : [...form.categories, c],
                  })
                }
                className={clsx(
                  "rounded-full border px-2.5 py-1 text-[11px]",
                  on ? "border-fg bg-fg text-bg" : "border-line-strong text-fg-2",
                )}
                aria-pressed={on}
              >
                {CATEGORY_LABELS[c]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          className={buttonClass("primary", "sm")}
          disabled={pending}
          onClick={async () => {
            setSaved(false);
            const res = await run(() =>
              postJson(
                "/api/card",
                {
                  approvalThresholdCents: Math.round(form.approval * 100),
                  perPaymentLimitCents: Math.round(form.perPayment * 100),
                  dailyLimitCents: Math.round(form.daily * 100),
                  monthlyLimitCents: Math.round(form.monthly * 100),
                  allowedCategories: form.categories,
                },
                "PATCH",
              ),
            );
            if (res) setSaved(true);
          }}
        >
          Save policy
        </button>
        {saved && <span className="text-xs text-fg-2">Saved.</span>}
        {error && <span className="text-xs text-critical">{error}</span>}
      </div>
    </div>
  );
}

export function PremiumDataBuyer({ deals }: { deals: { id: string; name: string }[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState(deals[0]?.id ?? "");
  const [out, setOut] = useState<{ message: string; findings: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          className={input}
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          aria-label="Deal"
        >
          {deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button
          className={buttonClass("primary")}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await fetch(`/api/x402/research/${productId}`);
              const requirements = (await res.json()) as {
                accepts?: { maxAmountRequired: string }[];
              };
              // The API answered 402 with a price. The agent pays from its wallet and retries (server side, via the Copilot's tool).
              const paid = await postJson<{ message: string; findings?: string[] }>(
                "/api/pay/x402",
                { productId, quotedPrice: requirements.accepts?.[0]?.maxAmountRequired },
              );
              setOut({ message: paid.message, findings: paid.findings ?? [] });
            } catch (err) {
              setOut({ message: err instanceof Error ? err.message : String(err), findings: [] });
            } finally {
              setBusy(false);
              router.refresh();
            }
          }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Buy for $0.50
        </button>
      </div>
      <p className="text-[11px] text-muted">
        Pay-per-call data in the style of x402. The data API answers{" "}
        <code>402 Payment Required</code> with a price, your agent pays from its wallet under the
        card policy, and the data comes back.
      </p>
      {out && (
        <div className="rounded-2xl border border-line bg-surface-2 p-3 text-sm">
          <div className="text-fg">{out.message}</div>
          {out.findings.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-fg-2">
              {out.findings.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function PaymentHistory({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) return <EmptyState>No agent payments yet.</EmptyState>;
  return (
    <ul className="divide-y divide-line">
      {payments.map((p) => (
        <li key={p.id} className="flex items-start gap-3 py-2.5">
          <span className="mt-0.5 text-lg" aria-hidden>
            {p.merchantIcon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-fg">{p.merchantName}</span>
              <span className="shrink-0 text-sm font-semibold tabular">
                {formatUsd(p.amountCents)}
              </span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <span className="truncate text-[11px] text-muted">
                {p.createdAt.slice(5, 16).replace("T", " ")} ·{" "}
                {p.channel === "x402" ? "x402 API" : p.channel.toUpperCase()} · {p.description}
              </span>
              <Badge
                tone={
                  p.status === "approved"
                    ? "good"
                    : p.status === "declined"
                      ? "critical"
                      : "warning"
                }
              >
                {p.status.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
