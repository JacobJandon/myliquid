# MyLiquid

- What it is: a runtime governance layer for AI agents that trade and pay with real money (**MyLiquid Gate**). Before
  an agent's trade or payment executes, it checks who the agent is, decides what it may do from that identity, the end
  customer's mandate and the firm's rules, sends anything bigger to a human, keeps tamper-evident evidence of every
  decision, and can stop every agent at once. A consumer app (an AI agent with a Tamagotchi-style pet that invests,
  rebalances and pays within the user's limits) is the reference deployment, the sales demo and the consumer beachhead.
- Who it is for: the paying customer is the head of product, CTO or chief compliance officer at a mid-size broker,
  crypto venue or neobank that is opening customer accounts to AI agents; then trading-platform vendors and agentic
  trading startups. The app's beachhead is agent-curious self-directed investors (invest monthly in a broker app,
  already ask ChatGPT or Claude about money, $5k to $250k invested).
- What it sells, at what price: Gate, priced per governed action (reads are free). Developer: free, 10,000 governed
  actions a month. Growth: $1,500 a month for 1M governed actions, then $1 per extra 1,000. Enterprise: $60,000 to
  $250,000 a year. Agent certification: $499 per agent a year. The consumer app is free today on demo money; a paid
  subscription ("MyLiquid Plus", price not set) is planned only after real money arrives through licensed partners.
- Where and how: online, US first (Delaware C-corp recommended, not yet incorporated). Gate is delivered as a hosted
  decision API, an SDK and an MCP guardrail proxy that sits in front of a broker's existing MCP server with no code
  change on their side. Customers come from a free six-month design-partner programme, an open-source proxy,
  compliance content and agent-trading hackathons. The app is an installable web app and an Android APK.
- Budget and constraints: a lean first 12 months of about $710,000, to be raised as a $750k to $1M pre-seed SAFE
  after design partners sign. Solo founder today (co-founder search planned). No customer funds held, no investment
  advice before an adviser registration exists, no SOC 2 report yet. Year-1 target: about $480,000 ARR by month 12.
  Source: `docs/startup/plan.md` (2026-10-02, status 2026-10-19) and `docs/discovery/`.
