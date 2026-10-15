# MyLiquid with a live AINRA registrar

Out of the box, MyLiquid verifies AINRA passports against the **testbed**: four pre-minted sample agents, verified
at the fixed time they were minted. This guide replaces that with a **live registrar**.

A live registrar is AINRA's own `registrar-box`, with real hybrid Ed25519 + ML-DSA-65 signatures, a transparency
log and signed revocation status. With it:

- **Hiring a hosted trader** (Traders page) issues it its own AINRA passport, for example
  `did:ainra:registrar-07:myliquid:momentum-trader-…`.
- **Every run** presents a fresh presentation of that passport. MyLiquid verifies it at the real time, fail
  closed, before the trader may read or trade.
- **Revoke identity** revokes the passport at the registrar, as its operator would. MyLiquid refuses it straight
  away:
  - the trader is cut off;
  - its pending proposals are withdrawn;
  - you get an alert.
- **The Traders page** shows the registrar: *Live registrar · registrar-07 · N identities*.

The registrar is accredited by a **TEST-ROOT** it creates on first start. AINRA's production root doesn't exist
until its genesis ceremony, so this is real software and real cryptography under a test root. When the
production root exists, swap in its anchor files.

## Run it on your computer

Needs git, a Rust toolchain ([rustup.rs](https://rustup.rs)) and Node 22.

```bash
scripts/ainra-live.sh     # builds AINRA's registrar-box from source, starts it, accredits it, prints the env
```

1. Copy the four lines it prints (`AINRA_REGISTRAR_URL`, `AINRA_REGISTRAR_TOKEN`, `AINRA_ROOTS_FILE`,
   `AINRA_DIRECTORY_FILE`) into `.env.local`.
2. Run `npm run dev`.
3. Open **Traders** and hire a trader.

The registrar's own console is at `http://127.0.0.1:4950/console`.

## Run it with Docker

`compose.yaml` runs both services: the registrar (`deploy/ainra/`, built from AINRA's source) and MyLiquid.

```bash
echo "AINRA_REGISTRAR_TOKEN=$(openssl rand -hex 24)" > .env
docker compose up --build
```

Then open http://localhost:3000. Two volumes hold the state:

- `ainra-data`: the registrar's data, its keys and log;
- `ainra-anchors`: the trust anchors it wrote on first start. MyLiquid mounts them read-only.

Keep both: losing the registrar's data means losing every identity it issued.

The same files run on any host with Docker and a disk, for example a small VPS, Railway or Fly.io with a volume.

## Use it from Vercel

Vercel runs MyLiquid but can't run the registrar, so the registrar lives on any host with a disk (above).

1. Make the registrar reachable over HTTPS, for example behind Caddy or the host's proxy.
2. In Vercel, set these environment variables and redeploy:

   | Variable | Value |
   |---|---|
   | `AINRA_REGISTRAR_URL` | The registrar's address |
   | `AINRA_REGISTRAR_TOKEN` | Its write token |
   | `AINRA_ROOTS_JSON` | The contents of `roots.json` |
   | `AINRA_DIRECTORY_JSON` | The contents of `directory.json` |

## How it fits together

| Piece | File |
|---|---|
| Registrar client (issue, present, revoke, health) | `src/lib/ainra/registrar.ts` |
| Trust anchors from files or JSON variables | `src/lib/ainra/index.ts` |
| Hosted traders on live identities | `src/lib/services/hostedTraders.ts` (`hireTrader`, `runTrader`, `revokeTraderIdentity`) |
| Revoke route | `src/app/api/traders/[id]/revoke-identity/route.ts` |
| Local registrar | `scripts/ainra-live.sh` |
| Docker | `deploy/ainra/Dockerfile`, `deploy/ainra/entrypoint.sh`, `compose.yaml` |
| End-to-end test against a live registrar | `src/lib/services/__tests__/ainra-live.test.ts` (skipped unless one is running) |

What MyLiquid trusts, and what it doesn't:

- **Never the registrar's word.** Every presentation it fetches goes through `checkPassport` like any agent's,
  against the anchors you gave it.
- **The write token** stays on the server. Without it the registrar refuses to issue or revoke (HTTP 401).
