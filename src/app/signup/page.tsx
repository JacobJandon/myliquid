import { redirect } from "next/navigation";
import { currentInvestor } from "@/lib/auth/current";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "@/components/auth/forms";
import { getDb } from "@/lib/db";
import { getCompanionRecord } from "@/lib/services/companion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create your account" };

export default async function SignupPage() {
  const investor = await currentInvestor();
  if (investor && investor.kind !== "guest") redirect("/app");
  const isGuest = investor?.kind === "guest";
  const pet = investor && isGuest ? getCompanionRecord(getDb(), investor.id) : null;
  return (
    <AuthShell
      title={isGuest ? `Keep ${pet?.name ?? "your agent"}` : "Hatch your own agent"}
      subtitle="Your account comes with an agent of its own. Three questions set the limits it works within, on every trade and every payment."
    >
      <SignupForm isGuest={isGuest} pet={pet ? { name: pet.name, color: pet.color } : undefined} />
    </AuthShell>
  );
}
