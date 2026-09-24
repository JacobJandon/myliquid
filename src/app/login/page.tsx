import { redirect } from "next/navigation";
import { currentInvestor } from "@/lib/auth/current";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/auth/forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in" };

export default async function LoginPage() {
  const investor = await currentInvestor();
  if (investor && investor.kind !== "guest") redirect("/app");
  return (
    <AuthShell title="Welcome back" subtitle="Log in to your agent desk.">
      <LoginForm />
    </AuthShell>
  );
}
