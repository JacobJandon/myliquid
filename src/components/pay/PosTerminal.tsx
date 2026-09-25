"use client";

import clsx from "clsx";
import { Check, Delete, Hourglass, Loader2, Nfc, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Merchant } from "@/lib/domain/payments";
import type { PaymentRequest } from "@/lib/services/payments";
import { postJson } from "@/components/client";
import { formatUsd } from "@/components/format";
import { buttonClass } from "@/components/ui";
import { LogoMark } from "@/components/brand/LogoMark";

/** Decorative pixel code (not a scannable QR): derived from the request code. */
function PixelCode({ code, size = 120 }: { code: string; size?: number }) {
  const n = 17;
  const cells = useMemo(() => {
    let h = 2166136261;
    const out: boolean[] = [];
    for (let i = 0; i < n * n; i++) {
      h = Math.imul(h ^ code.charCodeAt(i % code.length) ^ i, 16777619);
      out.push(((h >>> 7) & 1) === 1);
    }
    return out;
  }, [code]);
  const finder = (x: number, y: number) => {
    for (const [fx, fy] of [
      [0, 0],
      [n - 5, 0],
      [0, n - 5],
    ]) {
      if (x >= fx! && x < fx! + 5 && y >= fy! && y < fy! + 5) {
        const dx = x - fx!;
        const dy = y - fy!;
        return dx === 0 || dy === 0 || dx === 4 || dy === 4 || (dx === 2 && dy === 2) ? 1 : 0;
      }
    }
    return -1;
  };
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      className="pixelated rounded-md bg-white p-1"
      shapeRendering="crispEdges"
      aria-hidden
    >
      {cells.map((on, i) => {
        const x = i % n;
        const y = Math.floor(i / n);
        const f = finder(x, y);
        const fill = f === -1 ? on : f === 1;
        return fill ? <rect key={i} x={x} y={y} width={1} height={1} fill="#111" /> : null;
      })}
    </svg>
  );
}

export function PosTerminal({ merchants }: { merchants: Merchant[] }) {
  const [merchantId, setMerchantId] = useState(merchants[0]!.id);
  const merchant = merchants.find((m) => m.id === merchantId)!;
  const [cents, setCents] = useState(merchant.typicalCents);
  const [description, setDescription] = useState("");
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (
      !request ||
      request.status === "paid" ||
      request.status === "declined" ||
      request.status === "expired"
    )
      return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/terminal/${request.code}`);
      if (res.ok) setRequest(((await res.json()) as { request: PaymentRequest }).request);
    }, 1500);
    return () => clearInterval(t);
  }, [request]);

  async function charge() {
    setBusy(true);
    setError(null);
    try {
      const res = await postJson<{ request: PaymentRequest }>("/api/terminal", {
        merchantId,
        amountUsd: cents / 100,
        description: description || undefined,
      });
      setRequest(res.request);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const key = (k: string) => {
    if (k === "del") setCents((c) => Math.floor(c / 10));
    else if (k === "00") setCents((c) => Math.min(c * 100, 999_999_99));
    else setCents((c) => Math.min(c * 10 + Number(k), 999_999_99));
  };

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="rounded-[40px] border-[3px] border-fg bg-[#1b1b1b] p-4 shadow-[8px_8px_0_#111]">
        <div className="mb-3 flex items-center justify-between px-2 font-pixel text-[10px] uppercase text-[#9aa0a6]">
          <span className="flex items-center gap-1.5">
            <LogoMark size={14} animate={false} /> MyLiquid POS
          </span>
          <span className="flex items-center gap-1">
            <Nfc className="h-3 w-3" /> agent-ready
          </span>
        </div>
        <div className="min-h-[420px] rounded-[26px] bg-[#f5f3ee] p-4">
          {!request ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-[11px] text-muted">Merchant</span>
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm"
                  value={merchantId}
                  onChange={(e) => {
                    setMerchantId(e.target.value);
                    setCents(merchants.find((m) => m.id === e.target.value)!.typicalCents);
                  }}
                >
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.icon} {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-2xl bg-surface p-3 text-right">
                <div className="text-[11px] text-muted">Amount</div>
                <div className="font-display text-4xl tabular" aria-live="polite">
                  {formatUsd(cents)}
                </div>
              </div>
              <input
                className="h-9 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm"
                placeholder="Item (optional)"
                value={description}
                maxLength={60}
                onChange={(e) => setDescription(e.target.value)}
                aria-label="Item description"
              />
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "del"].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => key(k)}
                    className="h-11 rounded-xl border border-line bg-surface text-lg font-semibold active:bg-surface-3"
                    aria-label={k === "del" ? "Delete" : k}
                  >
                    {k === "del" ? <Delete className="mx-auto h-5 w-5" /> : k}
                  </button>
                ))}
              </div>
              <button
                className={clsx(buttonClass("primary"), "w-full")}
                disabled={busy || cents <= 0}
                onClick={charge}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Charge {formatUsd(cents)}
              </button>
              {error && <p className="text-xs text-critical">{error}</p>}
            </div>
          ) : (
            <div className="flex min-h-[388px] flex-col items-center justify-between text-center">
              <div>
                <div className="text-2xl" aria-hidden>
                  {request.merchantIcon}
                </div>
                <div className="text-sm text-fg-2">{request.merchantName}</div>
                <div className="font-display text-4xl tabular">
                  {formatUsd(request.amountCents)}
                </div>
                <div className="text-[11px] text-muted">{request.description}</div>
              </div>

              {request.status === "open" && (
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <PixelCode code={request.code} />
                    <span className="absolute -right-3 -top-3 flex h-8 w-8 animate-pulse-dot items-center justify-center rounded-full bg-accent text-accent-ink">
                      <Nfc className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-bold tracking-widest">{request.code}</div>
                  <div className="text-xs text-fg-2">Waiting for an agent to tap…</div>
                </div>
              )}
              {request.status === "paid" && (
                <div className="flex flex-col items-center gap-2" role="status">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-good text-white">
                    <Check className="h-9 w-9" />
                  </span>
                  <div className="font-display text-2xl">Approved</div>
                  <div className="text-sm text-fg-2">Paid by {request.paidBy}</div>
                </div>
              )}
              {request.status === "pending_approval" && (
                <div className="flex flex-col items-center gap-2" role="status">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-warning text-white">
                    <Hourglass className="h-8 w-8" />
                  </span>
                  <div className="font-display text-2xl">Waiting for owner</div>
                  <div className="text-sm text-fg-2">
                    {request.paidBy} asked their owner to approve.
                  </div>
                </div>
              )}
              {(request.status === "declined" || request.status === "expired") && (
                <div className="flex flex-col items-center gap-2" role="status">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-critical text-white">
                    <X className="h-9 w-9" />
                  </span>
                  <div className="font-display text-2xl">
                    {request.status === "expired" ? "Expired" : "Declined"}
                  </div>
                  <div className="text-xs text-fg-2">
                    {request.status === "expired"
                      ? "No agent paid in time."
                      : "The customer's agent card policy declined this payment."}
                  </div>
                </div>
              )}

              <button
                className={buttonClass("secondary", "sm")}
                onClick={() => {
                  setRequest(null);
                  setDescription("");
                }}
              >
                New sale
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
