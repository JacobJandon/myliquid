# Board: MyLiquid

**Vote: 2 fund if, 1 pass. Average score 4.0 / 10** (Offers 4 FUND IF · Product 4 FUND IF · Monopoly 4 PASS).
The members' memos are in `board/` (offers.md, product.md, monopoly.md); the brief they read is `board/brief.md`.
They apply published frameworks; they are not the people those frameworks come from.

## The risks more than one member raised

1. **No focus: four products, four buyers.** All three. Gate, the consumer app, Arena and AINRA compete for one
   founder's time; the consumer demo is the most finished piece while the buyer's product (tenancy, firm console,
   policy authoring) is the least. Every member asks for one product for one buyer.
2. **Nobody has said yes, or even been asked.** All three. No interviews, no design partner, no price ever quoted
   to a buyer. The Offers lens fears the pain may not belong to the broker while terms push agent risk onto the
   customer; the Monopoly lens counts 13 paying firms needed in year one from zero conversations.
3. **Trust and identity.** All three. The only passport Gate reads today comes from a registry the founder started;
   no SOC 2, one founder, capped liability. Product: fail-closed means agents without an AINRA passport are held for a
   human, which a broker won't accept at volume. (Note from the chair: in the code, unidentified keys are sent to
   approval rather than refused; the point stands that this throttles them.)
4. **Gate sits in someone else's order path.** Offers and Product. Its outage becomes the broker's; the delay it adds
   and its behaviour when unreachable are not stated.
5. **Copyable, in a funded field.** Monopoly (lead), Offers. Rules engine, identity check, log and kill switch are
   well understood; Runlayer, Archestra, AIUC and the platform vendors can reach the same buyer.

## Where they disagree

- **Is there a market today?** Offers: buyers with money and a regulatory push, so the market is real if the pain is
  owned. Monopoly: no small market is named or sized, so pass until one is.
- **Is the open-source proxy a strength?** Offers and Product like the zero-code entry. Monopoly says it gives the
  on-ramp away unless something closed compounds behind it.
- **What is the moat?** Monopoly sees one candidate (the cross-firm agent record, if many firms share it); Offers
  sees the moat in the offer itself (evidence an examiner accepts); Product in owning the first five minutes.

## Conditions, merged (the rest of the pack tests what it can)

- [ ] **One product, one buyer:** Gate (proxy + decision record) for mid-size brokers and crypto venues opening MCP
      access to agents. Consumer app frozen as a demo; Arena and the agent card shelved. *(all three)*
- [ ] **Discovery:** the 20 interviews; most broker/venue interviewees call it their own problem, with a named budget
      owner. *(Offers, Product)* → `/founder-consumer` gives a simulated first read; real interviews confirm.
- [ ] **A price signed before the pilot:** at least two (Offers) or three (Monopoly) design partners on a paid pilot or
      an LOI at a stated price. → `/founder-pricing`, `/founder-launch`
- [ ] **A named, sized small market** with its firm count and an 18-month share. *(Monopoly)* → `/founder-competitors`
- [ ] **The copycat answer:** the advantage that grows with each firm and how it stays closed. *(Monopoly)*
- [ ] **A stack on the buyer's path, with a guarantee:** readiness assessment, ready policies and supervisory
      procedures, exam-ready evidence pack, help through the vendor security review; e.g. no fee if the evidence pack
      fails their internal audit review. *(Offers)* → `/founder-offer`, priced by `/founder-cfo`
- [ ] **The buyer's side built first:** tenancy, firm console, policy authoring; the first five minutes proven
      without the founder in the room. *(Product)* → `/founder-ops`, `/founder-launch`
- [ ] **The identity seam fixed:** one adapter beyond AINRA, or a tier for unidentified agents with tight limits.
      *(Offers, Product)*
- [ ] **Numbers on the order path:** measured delay and stated down-behaviour, in the contract. *(Product)*
- [ ] **A trust plan:** SOC 2 timeline, AINRA under separate governance. *(Offers)*
- [ ] **Someone who has sold to regulated financial firms** on the team. *(Monopoly)*

## The strongest version the board can see

Not what was pitched. A single product: **an exam-ready control layer for mid-size brokers and crypto venues that
opened MCP access to AI agents this year.** One sentence, as Product put it: *Gate decides whether an AI agent may
make a trade or payment, and keeps the proof.* It is sold to the compliance officer as the evidence a supervisor will
ask for (SAFR and FINRA headings), installed by the engineer in a day through the proxy, with a paid pilot priced up
front and a guarantee tied to the evidence passing review. Identity is multi-standard from the first customer, with
AINRA as one verifier among several. The consumer app becomes what it already is best at, the live demo, and gets no
new features until a broker pays. The durable asset to build toward is the cross-firm record of how each agent
behaves, which no single broker can produce about itself.
