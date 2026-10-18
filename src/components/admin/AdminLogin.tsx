"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/components/client";
import { buttonClass } from "@/components/ui";

export function AdminLogin() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="mx-auto mt-24 max-w-sm space-y-3 rounded-2xl border-2 border-fg bg-surface p-6 shadow-[4px_4px_0_#111]"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          await postJson("/api/admin/session", { token });
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }}
    >
      <h1 className="font-display text-2xl text-fg">Founder dashboard</h1>
      <label className="block text-sm text-fg-2">
        Admin token
        <input
          type="password"
          autoComplete="current-password"
          className="mt-1 h-10 w-full rounded-xl border border-line-strong bg-surface-2 px-3 text-sm text-fg outline-none focus:border-fg"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </label>
      <button className={buttonClass("primary")} type="submit">
        Open
      </button>
      {error && (
        <p className="text-sm text-critical" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function AdminLogout() {
  const router = useRouter();
  return (
    <button
      type="button"
      className={buttonClass("ghost", "sm")}
      onClick={async () => {
        await postJson("/api/admin/session", undefined, "DELETE");
        router.refresh();
      }}
    >
      Lock
    </button>
  );
}
