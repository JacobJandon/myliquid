# MyLiquid on your phone

MyLiquid works as a phone app on Android and iPhone. On a phone you get:

- a bottom tab bar: Home, Invest, Pay, Talk, More;
- your portfolio value with a chart you can scrub with a finger;
- the pet;
- its own icon, full screen, with an offline screen.

There are three ways to put it on a phone, cheapest first. The first two cost nothing.

| Way | Cost | What you need | Best for |
|---|---|---|---|
| [1. Install from the browser](#1-install-from-the-browser-free-today) | $0 | Nothing | Testing now; showing people |
| [2. Android APK](#2-android-apk-free) | $0 | GitHub Actions (free for this public repo) | A real `.apk` file to sideload; preparing for Play |
| [3. Google Play](#3-google-play-later) | $25 once | A company with a D-U-N-S number | The public launch |

## 1. Install from the browser (free, today)

**Android (Chrome):**

1. Open your MyLiquid address, enter the site password and sign in (or try the demo).
2. Tap **Install** on the "Get the MyLiquid app" card on Home, or **More → Install the app**, or Chrome's menu
   **⋮ → Install app**.

Chrome builds a real Android app from the site (a "WebAPK"). It sits in your app drawer and app switcher, opens
full screen, and has shortcuts when you long-press the icon: Invest, Pay, Talk, Activity.

**iPhone (Safari):** tap **Share → Add to Home Screen**. The app shows the same hint under **More**.

**How it stays up to date.** Every deploy updates the app instantly; there is nothing to reinstall.

**The site password.** It is asked once per device and remembered for 90 days. Changing
`MYLIQUID_SITE_PASSWORD` signs every device out.

## 2. Android APK (free)

GitHub Actions builds an Android app (`android/`, a Trusted Web Activity that opens the site) on every change to
it.

**To build and install it:**

1. On GitHub, open **Actions → Android app**. Open the latest run, or click **Run workflow**. You can type the
   site's address there.
2. Under **Artifacts**, download **MyLiquid-android-N** and unzip it.
3. Open `MyLiquid-N.apk` on your phone and allow installing from your browser or files app when Android asks.

**Which site it opens.**

- The build uses the repository variable `MYLIQUID_HOST`, for example `myliquid-jacobjandons-projects.vercel.app`.
- Set it under **Settings → Secrets and variables → Actions → Variables**.
- Find your production domain in Vercel under **Project → Settings → Domains**.
- The run summary says which address each build opens.

**Without your own signing key**, each build is signed with a throwaway key. The app works, but:

- it shows a thin address bar at the top;
- you have to uninstall it before installing the next build.

**To open full screen and update in place, add your own key once:**

1. Create a key on your computer. Keep the file and passwords safe: without them you can never update the app.
   Never commit the file, because this repository is public.

   ```bash
   keytool -genkeypair -keystore myliquid-upload.keystore -alias myliquid -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 myliquid-upload.keystore      # on macOS: base64 -i myliquid-upload.keystore
   ```

2. Add these repository secrets under **Settings → Secrets and variables → Actions**:

   | Secret | Value |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | The base64 text from the step above |
   | `ANDROID_KEYSTORE_PASSWORD` | The keystore password |
   | `ANDROID_KEY_ALIAS` | `myliquid` |
   | `ANDROID_KEY_PASSWORD` | The key password, if you chose a different one |

3. Run the workflow again and copy the **SHA-256 fingerprint** from the run summary.
4. In Vercel, add the environment variable `ANDROID_CERT_FINGERPRINTS` with that fingerprint, then redeploy.
5. Check `https://<your domain>/.well-known/assetlinks.json`: it should show the fingerprint. Android now trusts
   the app, so it opens full screen.

**Sideloading rules are tightening.** Google now requires apps installed outside the Play Store to come from a
verified developer:

- From 30 September 2026 in Brazil, Indonesia, Singapore and Thailand; later elsewhere.
- Testers can still install with an extra confirmation step ("advanced flow") or ADB.
- Google offers a free limited-distribution developer account for up to 20 devices.

Installing from the browser (way 1) isn't affected. Check the
[current rules](https://android-developers.googleblog.com/2026/03/android-developer-verification.html) before
sending the APK to testers.

## 3. Google Play (later)

**The account.**

- Apps with stock trading or investment features must be published from an **organization** developer account
  ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/13634885)).
- An organization account needs a company and a free D-U-N-S number. Registration is $25 once.
- Organization accounts skip the 12-tester, 14-day closed test that new personal accounts must run.

**What to upload.** The `.aab` that the same workflow builds, signed with your upload key (way 2). Google then
signs the published app (Play App Signing).

**The Play Console also asks for:**

- the financial features declaration;
- a privacy policy;
- the data safety form;
- clear "simulated markets, demo money" wording until real money goes live through licensed partners (see
  [`startup/research.md`](startup/research.md) §5).

**iPhone App Store.**

- It costs $99 a year.
- Apple rejects apps that only wrap a website (guideline 4.2).
- So the iPhone version stays a home-screen web app until it needs something native, such as push notifications,
  Face ID or widgets. At that point a native shell (for example Capacitor) is the next step.

## What it costs to run

| Item | Cost |
|---|---|
| Hosting (Vercel) | Free on Hobby for personal, non-commercial use; Pro at $20 a month per member once it is a business |
| Database (Turso) | Free tier |
| Claude for the agents | Optional: without `ANTHROPIC_API_KEY` the agents run in offline mode for free |
| Android builds (GitHub Actions) | Free for public repositories |
| Google Play | $25 once |
| Apple App Store | $99 a year (later) |

## How it is built

| Piece | File |
|---|---|
| App manifest (name, icons, shortcuts, screenshots) | `src/app/manifest.ts`, `public/icons/`, `public/screenshots/`, `src/app/apple-icon.png` |
| Service worker | `public/sw.js` |
| Install card and menu row | `src/components/pwa/InstallApp.tsx` |
| Offline screen | `src/app/offline/page.tsx` |
| Phone tab bar and More sheet | `MobileTabBar` in `src/components/app/Sidebar.tsx` |
| Portfolio header | `src/components/app/PortfolioHero.tsx` |
| Site password page | `src/app/gate/page.tsx`, `src/app/api/site-gate/route.ts`, `src/lib/auth/siteGate.ts`, `src/proxy.ts` |
| Android app | `android/` (generated with Bubblewrap; `twa-manifest.json` holds its settings) |
| Android build | `.github/workflows/android.yml` |
| Digital Asset Links | `src/app/.well-known/assetlinks.json/route.ts`, `src/lib/mobile/assetLinks.ts` |

What the service worker caches:

- **Cached:** build assets, icons and the offline screen.
- **Never cached:** pages and API responses. Balances, orders and payments always come fresh from the server, and
  nothing about an account is stored on the device.

What stays public behind the site password: the manifest, icons, screenshots, service worker, offline screen and
asset links (`isPublicPath` in `src/lib/auth/siteGate.ts`). None of them holds account data, and phones fetch them
without cookies when they install the app.
