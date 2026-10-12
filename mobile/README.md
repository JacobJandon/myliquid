# MyLiquid for iPhone

A small native app (Expo) that opens the MyLiquid web app full screen: its own icon and splash, swipe back, pull
to refresh, and links to other sites opening in Safari. Everything else (tab bar, chart, pet, Agent Pay) is the
web app's phone layout, so every deploy updates the app too.

The site it opens is in `site.ts`. Change it there, or set `EXPO_PUBLIC_SITE_URL`, if your MyLiquid address is
different.

## Test it on your iPhone

Three ways, quickest first.

### 1. Expo Go and Snack: free, about 5 minutes, no installs on your computer

1. On your iPhone, install **Expo Go** from the App Store.
2. On a computer, open [snack.expo.dev](https://snack.expo.dev).
3. Open `App.js` there, delete what's in it, and paste in [`snack/App.js`](snack/App.js) from this folder. Change
   `SITE_URL` at the top if your address is different.
4. In the panel on the right, choose **My Device**. Scan the QR code with the iPhone's camera; it opens in Expo
   Go.

MyLiquid's password page appears once; then sign in or tap **Try the live demo**.

### 2. Expo Go and your computer: free, live from this folder

Needs Node 20 or newer on your computer.

```bash
cd mobile
npm install
npm run tunnel
```

Scan the QR code it prints with the iPhone's camera. Changes to the code reload on the phone.

### 3. TestFlight: Apple's testing app, $99 a year

This is the real app as Apple ships it: install from TestFlight, share with up to 100 people on your team
without a review.

You need:

- the Apple Developer Program ($99 a year; enroll as an organization once the company exists);
- a free Expo account ([expo.dev](https://expo.dev)).

The first time, from a computer:

```bash
cd mobile
npm install
npx eas-cli@latest login
npx eas-cli@latest init          # links the app to your Expo account; commit the app.json change
npm run testflight               # builds on Expo's servers and uploads to TestFlight
```

`npm run testflight` asks for your Apple ID once. It creates the app in App Store Connect and its certificates,
then uploads the build. When Apple finishes processing it (about 10–30 minutes), open **TestFlight** on your
iPhone and install MyLiquid.

After that, you can build from GitHub instead:

1. Create a token at expo.dev → Account settings → Access tokens.
2. Add it as the repository secret `EXPO_TOKEN`.
3. Run **Actions → iPhone app (TestFlight)**.

Notes:

- Builds on Expo's free plan wait in a queue; they're free up to a monthly limit.
- External testers (people outside your team) need Apple's beta review first.
- The App Store itself may reject an app that only wraps a website (guideline 4.2), so plan native features
  (push notifications, Face ID, widgets) before submitting there. TestFlight testing isn't affected.

## Check it

```bash
npm run typecheck
npx expo export --platform ios   # bundles the app without building it
```
