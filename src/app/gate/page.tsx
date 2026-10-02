import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { SITE_COOKIE, cookieMatches, safeNext } from "@/lib/auth/siteGate";
import { AuthShell } from "@/components/AuthShell";
import { buttonClass } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Private preview" };

const ERRORS: Record<string, string> = {
  wrong: "That isn't the password.",
  slow: "Too many tries. Wait a few minutes and try again.",
};

/** The site password page (MYLIQUID_SITE_PASSWORD). */
export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNext(rawNext);
  const password = process.env.MYLIQUID_SITE_PASSWORD;
  if (!password || cookieMatches((await cookies()).get(SITE_COOKIE)?.value, password))
    redirect(next);

  return (
    <AuthShell
      title="MyLiquid is private"
      subtitle="Enter the site password. This device remembers it for 90 days."
    >
      <form method="post" action="/api/site-gate" className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block text-sm text-fg-2">
          Site password
          <input
            type="password"
            name="password"
            required
            autoFocus
            autoComplete="current-password"
            className="mt-1 block h-11 w-full rounded-xl border border-line-strong bg-surface-2 px-3 text-base text-fg outline-none focus:border-accent"
          />
        </label>
        {error && ERRORS[error] && (
          <p role="alert" className="text-sm text-critical">
            {ERRORS[error]}
          </p>
        )}
        <button className={buttonClass("primary") + " w-full"}>
          <Lock className="h-4 w-4" /> Continue
        </button>
      </form>
    </AuthShell>
  );
}
