// Registrierung. E-Mail + Passwort (+ Wiederholung).

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

import { PasswordInput } from "../../components/PasswordInput";
import { supabase } from "../../lib/supabase";
import type { AuthStackParamList } from "../../navigation/types";
import { colors, fontSize, fontWeight, radius, spacing } from "../../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "SignUp">;

export function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!email.trim()) return "E-Mail fehlt.";
    if (!email.includes("@")) return "Die E-Mail sieht ungültig aus.";
    if (password.length < 8) return "Passwort muss mindestens 8 Zeichen haben.";
    if (password !== passwordRepeat) return "Die Passwörter stimmen nicht überein.";
    return null;
  }

  async function handleSignUp() {
    if (!supabase) return;
    const err = validate();
    if (err) {
      Alert.alert("Eingabe prüfen", err);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Registrierung fehlgeschlagen", error.message);
      return;
    }

    // Wenn Supabase "Confirm email" ausgeschaltet hat, kommt direkt eine
    // Session. Sonst muss der User auf den Bestätigungs-Link in der Mail klicken.
    if (data.session) {
      // AuthContext nimmt die Session automatisch auf.
      return;
    }
    Alert.alert(
      "Fast geschafft",
      "Wir haben dir eine Bestätigungs-Mail geschickt. Klicke auf den Link darin und melde dich dann an.",
      [{ text: "OK", onPress: () => navigation.navigate("Login") }],
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Konto erstellen</Text>
        <Text style={styles.subtitle}>
          Damit du dein Passwort jederzeit zurücksetzen und deine Rezepte teilen
          kannst.
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
            autoComplete="email"
          />

          <Text style={styles.label}>Passwort (mind. 8 Zeichen)</Text>
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            autoComplete="new-password"
          />

          <Text style={styles.label}>Passwort wiederholen</Text>
          <PasswordInput
            value={passwordRepeat}
            onChangeText={setPasswordRepeat}
            autoComplete="new-password"
          />

          <Pressable
            onPress={handleSignUp}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || loading) && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Erstelle Konto…" : "Konto erstellen"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
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
  form: {
    gap: spacing.sm,
  },
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
  primaryButtonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
