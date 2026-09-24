import { redirect } from "next/navigation";
import { currentInvestor } from "@/lib/auth/current";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "@/components/auth/forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create your account" };

export default async function SignupPage() {
  const investor = await currentInvestor();
  if (investor && investor.kind !== "guest") redirect("/app");
  const isGuest = investor?.kind === "guest";
  return (
    <AuthShell
      title={isGuest ? "Save your account" : "Open your MyLiquid account"}
      subtitle="Three questions set your limits. Sentinel enforces them on every trade, whoever places it."
    >
      <SignupForm isGuest={isGuest} />
    </AuthShell>
  );
}
