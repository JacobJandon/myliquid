import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import { SITE_URL } from "./site";

/**
 * MyLiquid for iPhone (and Android): a native shell around the MyLiquid web app. The web app already has the
 * phone layout (tab bar, safe areas, portfolio chart, pet), so this shell only adds what a browser tab can't:
 * its own icon, full screen, swipe back, pull to refresh, and links to other sites opening in the browser.
 */

const PAPER = "#f5f3ee";
const INK = "#111111";
const host = new URL(SITE_URL).host;

export default function App() {
  const web = useRef<WebView>(null);
  const [failed, setFailed] = useState(false);

  // Pages on MyLiquid stay in the app; anything else (GitHub, Vercel, mail) opens outside it.
  const stayInApp = (req: ShouldStartLoadRequest) => {
    if (req.url.startsWith("about:") || req.url.startsWith("blob:") || req.url.startsWith("data:"))
      return true;
    try {
      if (new URL(req.url).host === host) return true;
    } catch {
      return true;
    }
    Linking.openURL(req.url).catch(() => undefined);
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
          accessibilityRole="button"
          onPress={() => {
            setFailed(false);
            web.current?.reload();
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
        source={{ uri: `${SITE_URL}/app` }}
        style={styles.web}
        // The web app pads itself with env(safe-area-inset-*), so the page runs edge to edge.
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        // Lets the web app know it is inside this app (no "install the app" card).
        applicationNameForUserAgent="MyLiquidApp/1.0"
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        decelerationRate="normal"
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={stayInApp}
        startInLoadingState
        renderLoading={() => (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <ActivityIndicator color={INK} />
          </View>
        )}
        onError={() => setFailed(true)}
        onContentProcessDidTerminate={() => web.current?.reload()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },
  web: { flex: 1, backgroundColor: PAPER },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: PAPER,
  },
  title: { fontSize: 28, fontWeight: "800", color: INK },
  body: { fontSize: 15, color: "#4a4843", textAlign: "center", maxWidth: 300 },
  button: {
    marginTop: 8,
    backgroundColor: INK,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: PAPER, fontSize: 15, fontWeight: "600" },
});
