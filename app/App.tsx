// Einstiegspunkt der App.
// Layert die Provider und entscheidet, welcher Navigator angezeigt wird:
//   - Supabase nicht konfiguriert → Setup-Hinweis-Screen
//   - Auth lädt                   → Splash
//   - Nicht eingeloggt            → AuthNavigator (Login/Sign-Up/Reset)
//   - Eingeloggt                  → AppNavigator (Rezepte etc.)

import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { initDatabase } from "./src/db/init";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AuthNavigator } from "./src/navigation/AuthNavigator";
import { SupabaseSetupScreen } from "./src/screens/auth/SupabaseSetupScreen";
import { AuthProvider, useAuth } from "./src/state/AuthContext";
import { FilterProvider } from "./src/state/FilterContext";
import { colors, fontSize, fontWeight, spacing } from "./src/theme";

const isWeb = Platform.OS === "web";

type InitStatus = "loading" | "ready" | "error";

export default function App() {
  const [status, setStatus] = useState<InitStatus>(isWeb ? "ready" : "loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lokale DB beim App-Start initialisieren (CREATE TABLE + Seed)
  useEffect(() => {
    if (isWeb) return;
    (async () => {
      try {
        await initDatabase();
        setStatus("ready");
      } catch (err) {
        setStatus("error");
        const msg =
          err instanceof Error ? `${err.message}\n\n${err.stack ?? ""}` : String(err);
        setErrorMsg(msg);
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      {isWeb ? (
        <WebNotice />
      ) : status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Datenbank wird vorbereitet…</Text>
        </View>
      ) : status === "error" ? (
        <ScrollView contentContainerStyle={styles.errorWrap}>
          <Text style={styles.errorTitle}>Fehler beim Starten</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </ScrollView>
      ) : (
        // Reihenfolge der Provider:
        // SafeAreaView (Layout) → AuthProvider (kennt jeder Screen) → FilterProvider → NavigationContainer
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <AuthProvider>
            <FilterProvider>
              <RootRouter />
            </FilterProvider>
          </AuthProvider>
        </SafeAreaView>
      )}
      <StatusBar style="dark" backgroundColor={colors.navbarBg} translucent={false} />
    </SafeAreaProvider>
  );
}

// Entscheidet anhand des Auth-Zustands, welcher Navigator angezeigt wird.
function RootRouter() {
  const { loading, user, configured } = useAuth();

  if (!configured) return <SupabaseSetupScreen />;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Anmeldung wird geprüft…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

function WebNotice() {
  return (
    <ScrollView contentContainerStyle={styles.webWrap}>
      <Text style={styles.webTitle}>Food_Tempel</Text>
      <View style={styles.webNotice}>
        <Text style={styles.webNoticeTitle}>Browser-Modus eingeschränkt</Text>
        <Text style={styles.webNoticeText}>
          Die App nutzt eine lokale Datenbank (SQLite), die im Browser noch
          instabil ist. Bitte teste die App über den Android-Studio-Emulator:
          {"\n\n"}1. Android-Studio-Emulator starten
          {"\n"}2. Terminal: <Text style={styles.code}>npx expo start</Text>
          {"\n"}3. Im PowerShell-Fenster die Taste{" "}
          <Text style={styles.code}>a</Text> drücken
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  errorWrap: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.danger,
  },
  errorText: {
    fontFamily: Platform.select({ ios: "Courier", android: "monospace", default: "monospace" }),
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    backgroundColor: "#ffe5e5",
    padding: spacing.sm,
    borderRadius: 8,
  },
  webWrap: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  webTitle: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  webNotice: {
    backgroundColor: "#fff4e5",
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffcc80",
    gap: spacing.sm,
  },
  webNoticeTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: "#7a4f01",
  },
  webNoticeText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  code: {
    fontFamily: Platform.select({ ios: "Courier", android: "monospace", default: "monospace" }),
    backgroundColor: "#eee",
    paddingHorizontal: 4,
  },
});
