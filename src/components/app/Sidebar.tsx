"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bot,
  Droplets,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plug,
  Settings,
  Store,
  Zap,
} from "lucide-react";
import { postJson } from "@/components/client";

const NAV = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/invest", label: "Invest", icon: Store },
  { href: "/app/agents", label: "Agent desk", icon: Bot },
  { href: "/app/copilot", label: "Copilot", icon: MessageSquare },
  { href: "/app/autopilot", label: "Autopilot", icon: Zap },
  { href: "/app/connect", label: "Connect an agent", icon: Plug },
  { href: "/app/activity", label: "Activity", icon: Activity },
  { href: "/app/settings", label: "Guardrails", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

export function Sidebar({
  pendingCount,
  alertCount,
  user,
}: {
  pendingCount: number;
  alertCount: number;
  user: { name: string; email: string | null; kind: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className="flex h-full flex-col">
      <nav className="flex flex-col gap-1" aria-label="App">
        <Link href="/" className="mb-6 flex items-center gap-2 px-3 text-fg">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-accent-ink">
            <Droplets className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">MyLiquid</span>
        </Link>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          const count = href === "/app" ? pendingCount + alertCount : 0;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                active ? "bg-surface-3 text-fg" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {count > 0 && (
                <span className="rounded-full bg-accent/15 px-1.5 text-[10px] font-semibold text-accent">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3 px-3">
        <div className="rounded-xl border border-line p-3">
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
        <p className="text-[11px] text-muted">
          Simulated markets, demo money. Not investment advice.
        </p>
      </div>
    </div>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:hidden"
      aria-label="App (mobile)"
    >
      {NAV.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "shrink-0 rounded-full px-3 py-1.5 text-xs",
              active ? "bg-surface-3 text-fg" : "text-fg-2",
            )}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
