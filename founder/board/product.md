# Product lens
Score: 4/10 | Vote: FUND IF

## What is strong
- There is one clear moment to design around: the instant before an agent's trade or payment executes.
- The one sentence is hiding in the plan: "Gate decides whether an AI agent may make a trade or payment, and keeps the proof."
- The MCP guardrail proxy needs no code change on the broker's side. That takes the effort out of the first contact.
- The plan takes care over parts nobody sees: it fails closed, keeps a hash-chained record and never holds customer funds.
- The evidence export uses supervisors' headings. It starts from the compliance officer's real moment, an exam.

## What would kill it (the top 3, most dangerous first)
1. **There is no focus, and the wrong part is finished.** The plan has three products (Gate, a consumer app with a pet and a card, and Arena), four customer segments and a separate identity registry. The consumer demo is the most finished piece. The buyer's product is the least finished: multi-firm tenancy, the firm console and policy authoring are not built. A compliance officer's first five minutes has nowhere to happen yet.
2. **The core experience breaks at identity.** Gate fails closed. The only passport it reads today is AINRA's, a registry the founder also started; the other adapters are not built. On day one, every agent without an AINRA passport would be refused or sent to a human, and nobody knows how many agents carry one. A governance layer that stops everything won't be used.
3. **Gate sits inside someone else's experience and owns none of the seams.** The approval prompt, the refusal the agent gets and the end customer's view all live in the broker's app or the agent's code. Gate is in the order path, but the brief says nothing about the delay it adds or what happens when it is down. The contract offers "decision support with capped liability", but the buyer wants accountability. Every handoff can break, and Gate gets the blame when one does.

## The questions I would ask the founder
- What is it in one sentence without "and"?
- What does a broker CTO see in the first five minutes after pointing the proxy at their MCP server? What happens to agents already calling it without a passport?
- How many agents in use today hold an AINRA passport?
- When Gate asks for a human, who is that human? Where does the request appear, and how long does the order wait?
- How many milliseconds does Gate add to an order? What happens when Gate can't be reached?
- Who writes a firm's policies, and on what screen?
- What have you cut? Why does a demo for compliance buyers feature a Tamagotchi?

## If FUND IF: the conditions
1. **Cut to one product for one buyer:** the Gate proxy and decision record, for mid-size brokers. The consumer app stays a demo with no new features. Arena and the agent card are shelved.
2. **Build the buyer's side first:** tenancy, the firm console and policy authoring.
3. **Prove the first five minutes:** a design partner connects the proxy, sets a policy, sees a decision and exports evidence without the founder in the room.
4. **Fix the identity seam for agents that exist today:** at least one adapter beyond AINRA, or a tier for unidentified agents with tight limits.
5. **Put numbers on the order path:** measured delay and a stated behavior for when Gate is down, both in the contract.
6. **Finish the discovery interviews,** with buyers describing in their own words the moment the product serves.
