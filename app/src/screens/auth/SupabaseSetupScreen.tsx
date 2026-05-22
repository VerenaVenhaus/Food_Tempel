// Wird angezeigt, wenn die Supabase-Keys in app/.env noch nicht gesetzt sind.
// So crasht die App nicht, sondern erklärt dem User, was zu tun ist.

import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../../theme";

export function SupabaseSetupScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Setup nötig</Text>
      <View style={styles.box}>
        <Text style={styles.boxText}>
          Damit Login/Registrierung funktionieren, fehlen noch zwei Werte aus
          deinem Supabase-Projekt.
        </Text>
      </View>

      <Text style={styles.step}>1. Supabase-Projekt anlegen</Text>
      <Text style={styles.text}>
        Auf <Text style={styles.code}>supabase.com</Text> ein kostenloses Projekt
        erstellen.
      </Text>

      <Text style={styles.step}>2. URL + Anon-Key kopieren</Text>
      <Text style={styles.text}>
        Im Dashboard:{" "}
        <Text style={styles.code}>Project Settings → API</Text>{"\n"}
        - <Text style={styles.code}>Project URL</Text>{"\n"}
        - <Text style={styles.code}>anon public</Text>
      </Text>

      <Text style={styles.step}>3. In .env eintragen</Text>
      <View style={styles.codeBlock}>
        <Text style={styles.codeBlockText}>
          {`EXPO_PUBLIC_SUPABASE_URL=https://...\nEXPO_PUBLIC_SUPABASE_ANON_KEY=ey...`}
        </Text>
      </View>
      <Text style={styles.text}>
        Datei: <Text style={styles.code}>app/.env</Text>
      </Text>

      <Text style={styles.step}>4. Dev-Server neu starten</Text>
      <View style={styles.codeBlock}>
        <Text style={styles.codeBlockText}>npx expo start --clear</Text>
      </View>
      <Text style={styles.text}>
        Im Emulator dann <Text style={styles.code}>r</Text> drücken für Reload,
        oder die App neu öffnen.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  box: {
    backgroundColor: "#fff4e5",
    borderWidth: 1,
    borderColor: "#ffcc80",
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  boxText: {
    color: "#7a4f01",
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  step: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  code: {
    fontFamily: "monospace",
    backgroundColor: colors.surface,
    paddingHorizontal: 4,
  },
  codeBlock: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginVertical: spacing.xs,
  },
  codeBlockText: {
    fontFamily: "monospace",
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
});
