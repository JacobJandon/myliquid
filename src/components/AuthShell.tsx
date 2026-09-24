import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

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
      <Link href="/" className="mb-10">
        <Logo />
      </Link>
      <div className="w-full max-w-md rounded-3xl border-2 border-fg bg-surface p-6 shadow-[6px_6px_0_#111] sm:p-8">
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
