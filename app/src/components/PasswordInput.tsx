// Passwort-Eingabefeld mit Augen-Icon zum Anzeigen/Verbergen.
// Wird in Login, Registrierung und (später) "Passwort ändern" verwendet.

import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fontSize, radius, spacing } from "../theme";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  // "new-password" für Registrierung, "password" für Login —
  // beeinflusst Passwort-Manager auf dem Handy
  autoComplete?: "password" | "new-password" | "off";
};

export function PasswordInput({
  value,
  onChangeText,
  placeholder = "••••••••",
  autoComplete = "password",
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        // secureTextEntry={true}  → Sternchen, false → Klartext
        secureTextEntry={!visible}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        style={styles.toggle}
        accessibilityLabel={
          visible ? "Passwort verbergen" : "Passwort anzeigen"
        }
      >
        <Text style={styles.toggleIcon}>{visible ? "🙈" : "👁️"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    minHeight: 44,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    outlineStyle: "none" as never,
  },
  toggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  toggleIcon: {
    fontSize: 18,
  },
});
