// Passwort vergessen — wir schicken eine Reset-Mail.
// Der User klickt auf den Link in der Mail, kommt auf eine Supabase-Seite
// im Browser und kann dort ein neues Passwort setzen.
// (Deep-Link zurück in die App kommt später, ist hier nicht zwingend.)

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";
import type { AuthStackParamList } from "../../navigation/types";
import { colors, fontSize, fontWeight, radius, spacing } from "../../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!supabase) return;
    if (!email.trim()) {
      Alert.alert("Fehlt", "Bitte deine E-Mail eingeben.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);

    if (error) {
      Alert.alert("Fehler", error.message);
      return;
    }
    Alert.alert(
      "E-Mail gesendet",
      "Falls die Adresse bei uns registriert ist, bekommst du gleich eine Mail mit einem Link, um dein Passwort zurückzusetzen.",
      [{ text: "OK", onPress: () => navigation.navigate("Login") }],
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Passwort vergessen?</Text>
        <Text style={styles.subtitle}>
          Gib deine E-Mail ein. Wir senden dir einen Link, um dein Passwort
          zurückzusetzen.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>E-Mail</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="du@beispiel.de"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Pressable
            onPress={handleReset}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || loading) && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Sende…" : "Reset-Link senden"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  form: { gap: spacing.sm },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    minHeight: 44,
    outlineStyle: "none" as never,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  primaryButtonPressed: { opacity: 0.8 },
  primaryButtonText: {
    color: "#fff",
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
