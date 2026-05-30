// Wiederverwendbares Formular-Feld: Label + TextInput.
// Optional mit `multiline` für mehrzeilige Felder (z.B. Anleitung).
//
// Indem wir das in eine eigene Komponente packen, sehen alle Felder
// im Rezept-Formular gleich aus — und Änderungen am Aussehen
// passieren an einer Stelle.

import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  // Großes mehrzeiliges Feld (z.B. ausführliche Beschreibung) — startet mit
  // ~100 px Höhe und wächst mit dem Inhalt.
  multiline?: boolean;
  // Sanftes mehrzeiliges Feld (z.B. Kurzbeschreibung) — startet einzeilig
  // (44 px wie ein normales Textfeld) und wächst nur dann nach unten, wenn
  // der Inhalt umbricht. Quasi "wächst mit, ohne aufzudrängen".
  growable?: boolean;
  keyboardType?: "default" | "numeric" | "email-address";
  required?: boolean;
  error?: string;
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  growable,
  keyboardType = "default",
  required,
  error,
}: Props) {
  // Beide Modi heißen für TextInput "multiline" — der Unterschied steckt
  // nur im Style.
  const isMulti = !!multiline || !!growable;
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={isMulti}
        keyboardType={keyboardType}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          growable && styles.inputGrowable,
          error && styles.inputError,
        ]}
        textAlignVertical={isMulti ? "top" : "center"}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  required: {
    color: colors.danger,
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
    // Web: kein default outline beim Fokus
    outlineStyle: "none" as never,
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: spacing.sm,
  },
  // growable startet wie ein normales Feld (minHeight 44), wächst aber mit
  // dem Inhalt nach unten — wir setzen KEINE max-Höhe, damit man "alles
  // sieht" wie vom User gewünscht.
  inputGrowable: {
    paddingTop: spacing.sm,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.danger,
  },
});
