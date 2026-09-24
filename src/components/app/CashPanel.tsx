"use client";

import clsx from "clsx";
import { useState } from "react";
import { postJson, useAction } from "@/components/client";
import { formatUsd } from "@/components/format";
import { buttonClass } from "@/components/ui";

export function CashPanel({
  cashCents,
  pendingCents,
}: {
  cashCents: number;
  pendingCents: number;
}) {
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const { run, pending, error } = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountUsd = Number(amount);
    const res = await run(() => postJson("/api/cash", { action: mode, amountUsd }));
    if (res) {
      setDone(
        mode === "deposit"
          ? `Deposited ${formatUsd(amountUsd * 100)}.`
          : `Withdrawal of ${formatUsd(amountUsd * 100)} is on its way (T+1).`,
      );
      setAmount("");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-2xl font-semibold tabular">{formatUsd(cashCents)}</div>
          <div className="text-xs text-muted">
            available{pendingCents > 0 ? ` · ${formatUsd(pendingCents)} settling` : ""}
          </div>
        </div>
        <div className="flex gap-1 rounded-full bg-surface-2 p-1 text-xs">
          {(["deposit", "withdraw"] as const).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMode(m)}
              className={clsx(
                "h-7 rounded-full px-3 capitalize",
                mode === m ? "bg-surface-3 text-fg" : "text-muted",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="Amount"
          aria-label={`${mode} amount in US dollars`}
          className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-surface-2 px-4 text-sm text-fg outline-none focus:border-accent tabular"
        />
        <button
          className={buttonClass(mode === "deposit" ? "primary" : "secondary")}
          disabled={pending || !Number(amount)}
        >
          {mode === "deposit" ? "Deposit" : "Withdraw"}
        </button>
      </div>
      <p className="text-[11px] text-muted">
        {mode === "withdraw"
          ? "Withdrawals are human-only. No agent can move money off MyLiquid."
          : "Demo money. Deposits settle instantly."}
      </p>
      {(done || error) && <p className="text-xs text-fg-2">{error ?? done}</p>}
    </form>
  );
}
