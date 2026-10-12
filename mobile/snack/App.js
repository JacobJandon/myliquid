// MyLiquid for iPhone, as one file for Expo Snack (https://snack.expo.dev).
// 1. Open snack.expo.dev on a computer, delete what is in App.js and paste this file in.
// 2. Change SITE_URL below if your MyLiquid address is different.
// 3. On your iPhone, install "Expo Go" from the App Store, then scan the QR code under "My Device" with the camera.

import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const SITE_URL = "https://myliquid-jacobjandons-projects.vercel.app";

const PAPER = "#f5f3ee";
const INK = "#111111";
const host = SITE_URL.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

export default function App() {
  const web = useRef(null);
  const [failed, setFailed] = useState(false);

  // Pages on MyLiquid stay in the app; anything else opens in Safari.
  const stayInApp = (req) => {
    const m = /^https?:\/\/([^/?#]+)/.exec(req.url);
    if (!m || m[1] === host) return true;
    Linking.openURL(req.url).catch(() => {});
    return false;
  };

  if (failed)
    return (
      <View style={styles.center}>
        <StatusBar style="dark" />
        <Text style={styles.title}>{"You're offline"}</Text>
        <Text style={styles.body}>MyLiquid only shows live balances, so it needs a connection.</Text>
        <Pressable
          style={styles.button}
          onPress={() => {
            setFailed(false);
            web.current && web.current.reload();
          }}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WebView
        ref={web}
        source={{ uri: SITE_URL + "/app" }}
        style={styles.root}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        applicationNameForUserAgent="MyLiquidApp/1.0"
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={stayInApp}
        startInLoadingState
        renderLoading={() => (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <ActivityIndicator color={INK} />
          </View>
        )}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: PAPER },
  title: { fontSize: 28, fontWeight: "800", color: INK },
  body: { fontSize: 15, color: "#4a4843", textAlign: "center", maxWidth: 300 },
  button: { marginTop: 8, backgroundColor: INK, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 },
  buttonText: { color: PAPER, fontSize: 15, fontWeight: "600" },
});
