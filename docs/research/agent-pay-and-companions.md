# Research: living agents, agent payments and the YC look (Sept 2026)

Background for phase 3 of MyLiquid: a pet agent in every account, Agent Pay
(tap to pay at terminals, pay-per-call data), and a rebrand in the style of
current YC-era startups. This note records what we looked at and what we took
from it. It complements [`agentic-finance-landscape.md`](agentic-finance-landscape.md).

Caveats: the sources are press coverage, vendor pages and blog posts, read in
September 2026. Several vendor sites were not reachable from our build
environment, so some claims come from search-result summaries of the linked
articles. Nothing here is an endorsement, and MyLiquid is not affiliated with Y
Combinator or any company named.

## 1. Agent payments are becoming real infrastructure

| Who | What | Link |
|---|---|---|
| **Mastercard Agent Pay** | *Agentic tokens* extend card tokenization (MDES): a tokenized credential bound to a specific agent, merchant scope and consent policy, so an agent can check out without holding the card number. **Agent Pay for Machines** (June 2026) targets high-frequency, low-value payments between agents across cards, bank accounts and stablecoins, with 30+ partners. | [Mastercard](https://www.mastercard.com/global/en/news-and-trends/press/2026/june/mastercard-launches-agent-pay-for-machines.html), [Fortune](https://fortune.com/2026/06/10/mastercard-ai-payments-protocol-launch-agentic-finance/), [CoinDesk](https://www.coindesk.com/business/2026/06/10/mastercard-prepares-for-a-future-where-ai-agents-make-payments-with-latest-introduction) |
| **Alipay Tap!** | In July 2026 Alipay connected its Xiaoyu agent to about 30 million Tap! merchant devices, turning payment terminals into access points for merchant analytics, marketing and membership, under an "Agentic Commerce Trust Protocol". | [The Paypers](https://thepaypers.com/payments/news/alipay-upgrades-tap-network-with-ai-agents-for-merchants), [Fintech News HK](https://fintechnews.hk/39587/fintechchina/alipay-upgrades-tap-devices-ai-agents/) |
| **Natural** | Raised a $30M Series A (Forerunner) in July 2026 to build payment rails for agents that hold wallets, pay invoices and buy things without a human signing off each step. | [TechCrunch](https://techcrunch.com/2026/07/20/natural-raises-30m-to-reinvent-payments-for-ai-agents-and-take-on-stripe/) |
| **Skyfire, Payman, Natural** | A comparison of agent-payment infrastructure: agent identity, wallets, spending controls and human-in-the-loop approval. | [FintechSpecs](https://fintechspecs.com/blog/skyfire-vs-payman-vs-natural-ai-agent-payment-infrastructure/) |
| **Orthogonal (YC W26)** | An API marketplace where agents discover and pay per call for APIs through one MCP server, built on x402. | [Yespress](https://yespress.io/orthogonal-yc-w26), [orthogonal.com](https://www.orthogonal.com/) |
| **HTTP 402 / x402** | The long-reserved `402 Payment Required` status is being used as a machine-readable price tag: the server answers 402 with payment requirements, the client pays and retries with a payment header. | [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/402), [DEV](https://dev.to/mattdeangit/http-402-payment-required-the-dormant-status-code-that-powers-the-agent-economy-335f) |

**What we took.**

- **A tokenized agent card, not a card number.** The pet carries an agent card
  (`agent_cards.token`), and its tools never see a PAN. It is the same idea as
  Mastercard's agentic tokens, simulated.
- **Policy is the product.** Every payment runs `evaluatePayment`:
  - *Hard rules* (card frozen, category blocked, per-payment/daily/monthly limit,
    wallet balance) decline outright.
  - *Soft rules* (above the approval line, a new merchant, a burst of payments,
    the pet asleep) ask the owner. A new merchant counts only above $25.
  - An owner approval re-checks only the hard rules.
- **The wallet is the ceiling.** Agents spend from a wallet the owner funds from
  cash, capped at $5,000. No agent tool can fund it, change the card or raise a
  limit.
- **Terminals.** `/terminal` is a public POS demo. It shows a short `LQ-XXXX`
  code as a stand-in for NFC, and a pet pays it from Agent Pay, chat or MCP.
- **x402-style data.** `/api/x402/research/{deal}` answers 402 with requirements.
  An MCP client whose key has the `pay` scope retries with `X-PAYMENT:
  myliquid-wallet`, and the wallet pays 50¢ under the same card policy.

**What we did not do.** We did not integrate with real card networks, stablecoins
or the x402 facilitator protocol, because those need a licensed issuer and real
funds. Payments move demo money between simulated wallets and fictional
merchants.

## 2. AI companions and the Tamagotchi loop

- **Sweekar** (CES 2026): a palm-sized, egg-shaped AI pet that hatches, needs
  feeding and care, grows through stages, remembers its owner, and comes in pink,
  yellow and blue shells. See [Android Headlines](https://www.androidheadlines.com/2026/01/sweekar-is-a-physical-tamagotchi-style-ai-companion-bringing-virtual-pets-back-in-2026.html)
  and [Engadget](https://www.engadget.com/ai/sweekar-turns-the-tamagotchi-into-a-physical-ai-pocket-pet-that-wont-die-on-you-023525228.html).
- **AI-tamago**: an open-source LLM-powered Tamagotchi whose state (hunger, mood)
  lives outside the model and is updated over time. See [GitHub](https://github.com/ykhli/AI-tamago).

**What we took.**

- **Vitals decay in real time.** Fullness drops about 4 points an hour, energy
  recovers about 8 an hour, and joy drifts back to neutral. They are computed from
  timestamps, so no background job is needed.
- **Mood reflects the portfolio.** Portfolio health comes from open Sentinel and
  Ledger alerts and from how much could be cash within 7 days. A critical alert
  makes the pet anxious. A book that is less than half liquid within a week
  lowers its health.
- **Five stages over ten levels:** Drop → Droplet → Splash → Wave → Tide. The pet
  is a procedural pixel sprite: server-rendered SVG, different per mood and stage.
- **Care actions have a point.**
  - *Feed* serves a "research snack": one true fact about your portfolio.
  - *Play* is a liquidity quiz: how much of your portfolio could be cash in 7 days?
  - *Sleep* is the kill switch, and only the owner can wake the pet.

**What we changed, deliberately.** Engagement loops in trading apps can push
people to trade more. The pet earns XP only for habits: checking in, deciding
proposals, reviewing alerts, completing quests and caring for it. Each habit has
a daily cap, and trading volume never earns XP. The pet cannot die. It gets
hungry, tired or sad and recovers when you come back.

## 3. The YC-era look

Current startup sites converge on a few patterns:

- **Bento grids.** Content sits in a grid of cards of different sizes, one idea
  per tile. It suits products with several distinct capabilities. See
  [Medium](https://medium.com/@aksamark/web-design-trends-2026-why-minimalism-is-evolving-into-bento-grids-16839fd31fb7)
  and [Landdding](https://landdding.com/blog/bento-grid-design-by-website-category-where-the-pattern-wins).
- **Light, paper-toned backgrounds**, heavy grotesk display type with tight
  tracking, ink-black primary buttons, one saturated accent, and a playful
  secondary colour.
- **Personality from one motif**, used consistently: a mascot, pixel art or hard
  offset shadows.

**What we built.**

- **Palette:**
  - warm paper background `#f5f3ee` with a faint dot grid;
  - ink `#111` for type and primary buttons;
  - liquid blue `#2f5bff` as the accent;
  - lime `#c8f560` for highlights, the logo and XP;
  - an LCD green palette for the pet's screen.
- **Type:** Inter for body, Inter Tight 700 for display, Silkscreen for pixel
  labels.
- **Sleeve colours:** re-validated as a categorical palette on the light surface.
  Every chart that uses them also shows labels.
- **Landing page:** a hero with the pet in its egg-shaped device and floating
  event chips, then a bento section, Agent Pay, the desk, the shadow-banking
  section and a CTA.
- **No invented social proof:** no "Backed by YC" badge, customer logos or
  testimonials.

## Sources

- https://www.mastercard.com/global/en/news-and-trends/press/2026/june/mastercard-launches-agent-pay-for-machines.html
- https://fortune.com/2026/06/10/mastercard-ai-payments-protocol-launch-agentic-finance/
- https://www.coindesk.com/business/2026/06/10/mastercard-prepares-for-a-future-where-ai-agents-make-payments-with-latest-introduction
- https://thepaypers.com/payments/news/alipay-upgrades-tap-network-with-ai-agents-for-merchants
- https://fintechnews.hk/39587/fintechchina/alipay-upgrades-tap-devices-ai-agents/
- https://techcrunch.com/2026/07/20/natural-raises-30m-to-reinvent-payments-for-ai-agents-and-take-on-stripe/
- https://fintechspecs.com/blog/skyfire-vs-payman-vs-natural-ai-agent-payment-infrastructure/
- https://yespress.io/orthogonal-yc-w26
- https://www.orthogonal.com/
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/402
- https://dev.to/mattdeangit/http-402-payment-required-the-dormant-status-code-that-powers-the-agent-economy-335f
- https://www.androidheadlines.com/2026/01/sweekar-is-a-physical-tamagotchi-style-ai-companion-bringing-virtual-pets-back-in-2026.html
- https://www.engadget.com/ai/sweekar-turns-the-tamagotchi-into-a-physical-ai-pocket-pet-that-wont-die-on-you-023525228.html
- https://github.com/ykhli/AI-tamago
- https://medium.com/@aksamark/web-design-trends-2026-why-minimalism-is-evolving-into-bento-grids-16839fd31fb7
- https://landdding.com/blog/bento-grid-design-by-website-category-where-the-pattern-wins
