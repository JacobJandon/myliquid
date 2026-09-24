import Link from "next/link";
import { Droplets } from "lucide-react";

/** Centered card layout shared by the log-in and sign-up pages. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-glow flex min-h-screen flex-col items-center px-4 py-10">
      <Link href="/" className="mb-10 flex items-center gap-2 text-fg">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-accent-ink">
          <Droplets className="h-4 w-4" />
        </span>
        <span className="text-lg font-semibold tracking-tight">MyLiquid</span>
      </Link>
      <div className="w-full max-w-md rounded-3xl border border-line-strong bg-surface/90 p-6 shadow-2xl sm:p-8">
        <h1 className="font-display text-3xl text-fg">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-2">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-6 max-w-md text-center text-[11px] text-muted">
        Simulated markets, fictional products, demo money. Not investment advice.
      </p>
    </div>
  );
}
