import { getDb } from "@/lib/db";
import { requireInvestor } from "@/lib/auth/current";
import { DEALS, requireProduct } from "@/lib/domain/catalog";
import type { Stage } from "@/lib/domain/companion";
import { formatUsd } from "@/lib/domain/money";
import { getCompanionView } from "@/lib/services/companion";
import {
  getCard,
  getWalletBalance,
  listOpenRequests,
  listPayments,
  spendSummary,
} from "@/lib/services/payments";
import { getCash } from "@/lib/services/repo";
import { AgentCardVisual } from "@/components/pay/AgentCardVisual";
import {
  CardControls,
  PaymentApprovals,
  PaymentHistory,
  PremiumDataBuyer,
  TapToPay,
  WalletPanel,
} from "@/components/pay/PayPanels";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agent Pay" };

export default async function PayPage() {
  const { id: investorId } = await requireInvestor();
  const db = getDb();
  const pet = getCompanionView(db, investorId);
  const card = getCard(db, investorId);
  const spend = spendSummary(db, investorId);
  const payments = listPayments(db, investorId, { limit: 30 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-fg">Agent Pay</h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-2">
          {pet.name} carries a tokenized agent card, so it can tap to pay at a terminal, check out
          online, or pay per call for data. It never sees a card number. Every payment is checked
          against your policy before money moves, and the wallet you fund is the hard ceiling.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6">
          <AgentCardVisual
            last4={card.last4}
            petName={pet.name}
            color={pet.color}
            stage={pet.stage.id as Stage}
            frozen={card.status === "frozen"}
          />
          <Card title="Wallet">
            <WalletPanel
              walletCents={getWalletBalance(db, investorId)}
              cashCents={getCash(db, investorId)}
            />
          </Card>
          <Card
            title="Spending today"
            subtitle={`${formatUsd(spend.todayCents)} of ${formatUsd(card.dailyLimitCents)} · ${formatUsd(spend.monthCents)} of ${formatUsd(card.monthlyLimitCents)} this month`}
          >
            <div className="h-3 overflow-hidden rounded-full border-2 border-fg bg-surface-2">
              <div
                className="h-full bg-accent"
                style={{
                  width: `${Math.min(100, (spend.todayCents / Math.max(card.dailyLimitCents, 1)) * 100)}%`,
                }}
              />
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card
            title="Tap to pay"
            subtitle="Hold your phone to a terminal, or enter its code. The card's policy decides."
          >
            <TapToPay nearby={listOpenRequests(db)} />
          </Card>
          <Card title="Waiting for your OK">
            <PaymentApprovals
              pending={listPayments(db, investorId, { status: "pending_approval" })}
            />
          </Card>
          <Card
            title="Pay-per-call data (x402)"
            subtitle="Let Scout buy a premium diligence report"
          >
            <PremiumDataBuyer
              deals={DEALS.map((d) => ({
                id: d.productId,
                name: requireProduct(d.productId).name,
              }))}
            />
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card
            title="Spending policy"
            subtitle="Like an agentic token: limits, allowed categories and when to ask you"
          >
            <CardControls key={JSON.stringify(card)} card={card} />
          </Card>
          <Card title="History">
            <PaymentHistory payments={payments} />
          </Card>
        </div>
      </div>
    </div>
  );
}
