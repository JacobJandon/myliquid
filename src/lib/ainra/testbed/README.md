# AINRA testbed artifacts

MyLiquid's AINRA testbed, minted with AINRA's own reference registrar (`registrar-box`) and accreditation tool
(`accredit`) from https://github.com/JacobJandon/ainra (Apache-2.0 OR MIT). Everything here is real hybrid
Ed25519 + ML-DSA-65 cryptography. `scripts/mint-ainra-testbed.sh` recreates it.

- `roots.json`: the **TEST-ROOT** public keys (Ed25519 + SLH-DSA). This is not a production root: AINRA's
  production root does not exist until its genesis ceremony.
- `directory.json`: the root-signed directory accrediting `registrar-07`.
- `agent-*.json`: presentations of four sample agents from fictional outside operators.

  | File | Agent | Tier | Capabilities |
  |---|---|---|---|
  | `agent-momentum-trader.json` | `ainra:registrar-07:northwind:momentum-trader@1.0.0` | L2 | `myliquid:read`, `myliquid:trade` |
  | `agent-research-analyst.json` | `ainra:registrar-07:northwind:research-analyst@1.0.0` | L1 | `myliquid:read` |
  | `agent-treasury-agent.json` | `ainra:registrar-07:harbor:treasury-agent@1.0.0` | L3 | `myliquid:read`, `myliquid:trade`, `myliquid:pay` |
  | `agent-yield-hunter.json` | `ainra:registrar-07:quickfox:yield-hunter@1.0.0` | L2 | `myliquid:read`, `myliquid:trade` |
  | `agent-yield-hunter-revoked.json` | the same agent, presented after its registrar revoked it | L2 | same |

- `meta.json`: the pinned unix time the presentations were made at. Their stapled revocation status is only
  fresh for five minutes after that, so MyLiquid verifies them **at that time** in testbed mode, and says so.

MyLiquid uses these when no real trust anchors are configured (`AINRA_ROOTS_FILE`, `AINRA_DIRECTORY_FILE`).
Everything verified against them is labelled `TESTBED · TEST-ROOT`.
