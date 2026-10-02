"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  CreditCard,
  Fingerprint,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Store,
  Zap,
} from "lucide-react";
import type { Stage } from "@/lib/domain/companion";
import type { CompanionView } from "@/lib/services/companion";
import { Logo } from "@/components/brand/Logo";
import { MiniPet } from "@/components/pet/PetRoom";
import { postJson } from "@/components/client";
import { InstallAppRow } from "@/components/pwa/InstallApp";
import { buttonClass } from "@/components/ui";

/** Grouped by what you came to do: your money, your agents, your account. Short labels fit the phone tab bar. */
const NAV_GROUPS = [
  {
    title: "Money",
    items: [
      { href: "/app", label: "Home", icon: Home },
      { href: "/app/invest", label: "Invest", icon: Store },
      { href: "/app/autopilot", label: "Autopilot", icon: Zap },
      { href: "/app/pay", label: "Agent Pay", icon: CreditCard },
    ],
  },
  {
    title: "Agents",
    items: [
      { href: "/app/copilot", label: "Talk", icon: MessageSquare },
      { href: "/app/agents", label: "Desk", icon: Bot },
      { href: "/app/connect", label: "Traders", icon: Fingerprint },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/app/activity", label: "Activity", icon: Activity },
      { href: "/app/settings", label: "Guardrails", icon: Settings },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

export function Sidebar({
  pendingCount,
  alertCount,
  paymentCount,
  user,
  pet,
}: {
  pendingCount: number;
  alertCount: number;
  paymentCount: number;
  user: { name: string; email: string | null; kind: string };
  pet: Pick<CompanionView, "name" | "color" | "level"> & {
    stage: Stage;
    mood: CompanionView["vitals"]["mood"];
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className="flex h-full flex-col">
      <nav className="flex flex-col gap-1" aria-label="App">
        <Link href="/" className="mb-5 px-3">
          <Logo />
        </Link>
        <Link
          href="/app"
          className="mb-4 rounded-2xl border border-line bg-surface p-2.5 hover:border-line-strong"
        >
          <MiniPet
            name={pet.name}
            color={pet.color}
            stage={pet.stage}
            mood={pet.mood}
            level={pet.level}
          />
        </Link>
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-2 flex flex-col gap-0.5">
            <div className="px-3 pb-1 pt-2 font-pixel text-[9px] uppercase text-muted">
              {group.title}
            </div>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              const count =
                href === "/app"
                  ? pendingCount + alertCount
                  : href === "/app/pay"
                    ? paymentCount
                    : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                    active ? "bg-fg text-bg" : "text-fg-2 hover:bg-surface-3 hover:text-fg",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{label}</span>
                  {count > 0 && (
                    <span
                      className={clsx(
                        "rounded-full px-1.5 text-[10px] font-semibold",
                        active ? "bg-bg text-fg" : "bg-fg text-bg",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="mt-auto space-y-3 px-3">
        <div className="rounded-xl border border-line bg-surface p-3">
          <div className="truncate text-sm text-fg">{user.name}</div>
          <div className="truncate text-[11px] text-muted">
            {user.kind === "guest" ? "Guest account" : (user.email ?? "Demo account")}
          </div>
          <button
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-fg-2 hover:text-fg"
            onClick={async () => {
              await postJson("/api/auth/logout");
              router.push("/");
              router.refresh();
            }}
          >
            <LogOut className="h-3 w-3" /> Log out
          </button>
        </div>
        <InstallAppRow className="rounded-xl px-1 text-xs text-fg-2 hover:text-fg" />
        <p className="text-[11px] text-muted">
          Simulated markets, demo money. Not investment advice.
        </p>
      </div>
    </div>
  );
}

/** The phone tab bar: the four places people go most, and everything else under More. */
const TABS = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/invest", label: "Invest", icon: Store },
  { href: "/app/pay", label: "Pay", icon: CreditCard },
  { href: "/app/copilot", label: "Talk", icon: MessageSquare },
];
const MORE = NAV.filter((n) => !TABS.some((t) => t.href === n.href));

export function MobileTabBar({
  pendingCount,
  alertCount,
  paymentCount,
  user,
}: {
  pendingCount: number;
  alertCount: number;
  paymentCount: number;
  user: { name: string; email: string | null; kind: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const moreActive = MORE.some((n) => isActive(pathname, n.href));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const tab = (active: boolean) =>
    clsx(
      "relative flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10px] font-medium",
      active ? "text-fg" : "text-muted",
    );
  const pill = (active: boolean) =>
    clsx("grid h-7 w-12 place-items-center rounded-full transition", active && "bg-accent-2");

  return (
    <>
      <nav
        aria-label="App (mobile)"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = !open && isActive(pathname, href);
            const count =
              href === "/app" ? pendingCount + alertCount : href === "/app/pay" ? paymentCount : 0;
            return (
              <Link
                key={href}
                href={href}
                className={tab(active)}
                aria-current={active ? "page" : undefined}
              >
                <span className={pill(active)}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                {label}
                {count > 0 && (
                  <span className="absolute left-1/2 top-1 ml-2 min-w-4 rounded-full bg-fg px-1 text-center text-[9px] leading-4 text-bg">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            className={tab(open || moreActive)}
            aria-expanded={open}
            aria-controls="more-sheet"
            onClick={() => setOpen(!open)}
          >
            <span className={pill(open || moreActive)}>
              <Menu className="h-5 w-5" aria-hidden />
            </span>
            More
          </button>
        </div>
      </nav>
      {open && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-20 bg-fg/30" onClick={() => setOpen(false)} aria-hidden />
          <div
            id="more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="More"
            className="fixed inset-x-0 bottom-0 z-20 rounded-t-3xl border-t-2 border-fg bg-surface px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+4.75rem)]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
            <div className="grid grid-cols-3 gap-2">
              {MORE.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs",
                      active ? "border-fg bg-fg text-bg" : "border-line text-fg",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                    {label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm text-fg">
              <InstallAppRow />
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate">{user.name}</div>
                  <div className="truncate text-[11px] text-muted">
                    {user.kind === "guest" ? "Guest account" : (user.email ?? "Demo account")}
                  </div>
                </div>
                <button
                  type="button"
                  className={buttonClass("secondary", "sm")}
                  onClick={async () => {
                    setOpen(false);
                    await postJson("/api/auth/logout");
                    router.push("/");
                    router.refresh();
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" /> Log out
                </button>
              </div>
              <p className="text-[11px] text-muted">
                Simulated markets, demo money. Not investment advice.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
