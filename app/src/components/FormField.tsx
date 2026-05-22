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
  multiline?: boolean;
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
  keyboardType = "default",
  required,
  error,
}: Props) {
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
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          error && styles.inputError,
        ]}
        textAlignVertical={multiline ? "top" : "center"}
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
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.danger,
  },
});
