# Deploying MyLiquid privately

This guide puts MyLiquid online for your own testing. It stays private: only you can open it.

The recommended setup is **Vercel** (hosting) plus **Turso** (the database). Both have free plans.

- **Why two services.** Vercel runs the app as serverless functions. They have no disk that lasts and they don't
  share one, so the SQLite file the app uses locally can't live there.
- **What Turso is.** Turso is hosted SQLite (libSQL). The app switches to it automatically when
  `TURSO_DATABASE_URL` is set.
- **Without Vercel.** If you'd rather not use Vercel, see [Any host with a disk](#any-host-with-a-disk-docker) at
  the end.

## Vercel + Turso (about 10 minutes)

### 1. Import the repository

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. Choose **Add New… → Project** and import **`jacobjandon/myliquid`**. Keep the defaults: the framework is
   detected as Next.js and the build command is `npm run build`.
3. Click **Deploy**. The first deployment builds `main`, which doesn't have the app yet, so it may fail. That's
   expected.

### 2. Build the app's branch

The app lives on the branch **`claude/myliquid-fintech-ai-agents-1svwct`**. Make it the branch Vercel builds:

1. Open **Settings → Environments → Production**. On older dashboards this is **Settings → Git**.
2. Set the production branch (**Branch Tracking**) to `claude/myliquid-fintech-ai-agents-1svwct` and save.

### 3. Add the database

1. In the project, open the **Storage** tab.
2. Choose **Create Database → Turso** (Vercel Marketplace).
3. Pick the region closest to Vercel's default function region (Washington, D.C., `iad1`). That is **AWS US East
   (Virginia)**.
4. Connect the database to the project for **all environments**. This adds `TURSO_DATABASE_URL` and
   `TURSO_AUTH_TOKEN` to the project.

You can also create a database at [turso.tech](https://turso.tech) instead. Then add the two variables yourself
under **Settings → Environment Variables**:

- `TURSO_DATABASE_URL`: the database URL (`libsql://…`).
- `TURSO_AUTH_TOKEN`: a database token.

The app creates its tables and seeds the demo market the first time it starts.

### 4. Keep it private

Under **Settings → Environment Variables**, add these:

| Variable | Value |
|---|---|
| `MYLIQUID_SITE_PASSWORD` | Any password. Every page then asks for it before anything else (any user name works). |
| `ANTHROPIC_API_KEY` | Optional. Without it the agents run in their deterministic offline mode. |

- **What the password protects.** It covers the whole site, including the public production URL.
- **What stays open.** The agent endpoints stay open for connected agents: `/api/mcp`, `/api/agent-identity`,
  `/api/x402/*` and `/api/health`. Each needs an API key that only a signed-in user can create (`/api/health`
  doesn't need a key).
- **Preview deployments.** Vercel also protects preview deployments on its own (Deployment Protection → Vercel
  Authentication).

### 5. Deploy and open it

1. Open **Deployments** and redeploy the latest deployment. Any new push to the branch also deploys.
2. Open the production URL (`https://<project>.vercel.app`) and enter the site password.
3. Click **Try the live demo**, or create an account.

**Checking the setup.** Open `https://<project>.vercel.app/api/health`:

- `{"ok": true, "database": "hosted", …}` means it's working.
- Otherwise it says what is missing, for example that no database is connected.

## What to expect

- **Speed.** The first request after a deploy creates and seeds the database, which takes a few seconds once.
  After that, most pages load in under a second and a new demo account takes a few seconds.
- **The market clock.** The simulated market catches up with the calendar when someone opens the app. Recurring
  buys and limit orders run then as well.
- **Resetting the data.** To wipe everything, run `npm run db:reset` on your machine with the same
  `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env.local`.
- **Schema changes.** Demo data is disposable before launch: a schema version change rebuilds the database.

## How it works

- **`src/lib/db/index.ts`** picks the database. It uses `TURSO_DATABASE_URL` (or `LIBSQL_URL`) when set,
  otherwise a SQLite file. On Vercel it refuses to start without a URL rather than write to a disk that
  disappears.
- **`src/lib/db/remote.ts`** puts the `libsql` client behind the same synchronous API as the local driver, so no
  service code changes. It evens out several differences:
  - how parameters bind and what rows look like;
  - transactions that nest;
  - statements prepared outside a transaction;
  - connections that expire after a few seconds idle.
- **Big writes** (seeding, a new account's history) are batched with `insertMany`, because every statement is a
  network round trip.
- **Two instances at once.** Several instances can run together, so the market clock checks inside its
  transaction that another one hasn't already advanced the day.
- **Testing against libSQL.** `npm run test:libsql` runs the whole test suite against a libSQL server. Point
  `LIBSQL_TEST_URL` at a local `turso dev`; it wipes that database.
- **`src/proxy.ts`** is the optional site password.

## Any host with a disk (Docker)

Hosts with a persistent disk run the app unchanged on its SQLite file. Examples are Railway, Fly.io, Render with a
disk, or your own server. Use the `Dockerfile` and mount a volume at `/data`:

```bash
docker build -t myliquid .
docker run -p 3000:3000 -v myliquid-data:/data \
  -e MYLIQUID_SITE_PASSWORD=choose-one -e ANTHROPIC_API_KEY=... myliquid
```

On Railway, for example:

1. Choose **New Project → Deploy from GitHub repo** and pick the branch above. The `Dockerfile` is detected.
2. Add a **Volume** mounted at `/data`.
3. Set the variables above.
4. Generate a domain.
