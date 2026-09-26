import { getDb } from "@/lib/db";
import { requireInvestor } from "@/lib/auth/current";
import { supportsStandingOrders } from "@/lib/domain/automation";
import { PRODUCTS, isLiquid } from "@/lib/domain/catalog";
import { listLimitOrders, listPlans } from "@/lib/services/automation";
import { listRules } from "@/lib/services/rules";
import { RulesPanel } from "@/components/app/RulesPanel";
import { LimitOrderList, RecurringPanel } from "@/components/app/StandingOrders";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Autopilot" };

export default async function AutopilotPage() {
  const { id: investorId } = await requireInvestor();
  const db = getDb();
  const rules = listRules(db, investorId).map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    lastTriggeredOn: r.lastTriggeredOn,
    createdBy: r.createdBy,
  }));
  const plans = listPlans(db, investorId);
  const limits = listLimitOrders(db, investorId, { limit: 20 });
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-fg">Autopilot</h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-2">
          Put your investing on a schedule, set the prices you want to trade at, and write
          strategies as rules. The market clock runs all of them every market day, and every trade
          passes the same pre-trade checks as any other order.
        </p>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-2xl text-fg">Recurring investments</h2>
          <p className="text-sm text-fg-2">
            Invest a fixed amount every week, two weeks or month. Buying on a schedule smooths out
            the price you pay.
          </p>
        </div>
        <RecurringPanel
          plans={plans}
          products={PRODUCTS.filter(supportsStandingOrders).map((p) => ({
            id: p.id,
            name: p.name,
          }))}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-2xl text-fg">Limit orders</h2>
          <p className="text-sm text-fg-2">
            Place them from a product&apos;s page. They fill on the first market day the price
            reaches your limit, and expire after 90 days.
          </p>
        </div>
        <Card>
          <LimitOrderList
            orders={limits}
            empty="No limit orders yet. Open a product to place one."
          />
        </Card>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-2xl text-fg">Rules</h2>
          <p className="text-sm text-fg-2">
            Strategies like <em>&ldquo;if bitcoin falls 20% from its high, buy $1,000&rdquo;</em>.
            Quant watches them every market day. Rules that agents create start paused, and fired
            rules follow your autonomy setting like any other agent trade.
          </p>
        </div>
        <RulesPanel
          rules={rules}
          products={PRODUCTS.filter(isLiquid).map((p) => ({ id: p.id, name: p.name }))}
        />
      </section>
    </div>
  );
}
