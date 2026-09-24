import { getDb } from "@/lib/db";
import { PRODUCTS, isLiquid } from "@/lib/domain/catalog";
import { listRules } from "@/lib/services/rules";
import { RulesPanel } from "@/components/app/RulesPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Autopilot" };

export default function AutopilotPage() {
  const rules = listRules(getDb()).map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    lastTriggeredOn: r.lastTriggeredOn,
    createdBy: r.createdBy,
  }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-fg">Autopilot</h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-2">
          Write strategies as rules, like{" "}
          <em>&ldquo;if bitcoin falls 20% from its high, buy $1,000&rdquo;</em>. Quant watches them
          every market day. Rules that agents create start paused, and every fired rule passes the
          same checks and approvals as any other agent trade.
        </p>
      </div>
      <RulesPanel
        rules={rules}
        products={PRODUCTS.filter(isLiquid).map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
