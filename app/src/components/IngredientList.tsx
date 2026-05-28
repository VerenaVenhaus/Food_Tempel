// Editor für die Zutaten-Liste eines Rezepts.
// Jede Zeile = eine Zutat (Menge + Einheit + Name). Reihenfolge wird beim
// Speichern als sortOrder verwendet.

import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../theme";
import { IngredientNameInput } from "./IngredientNameInput";

// Datentyp, mit dem das Formular intern arbeitet. Beim Speichern wird das
// in das Repository-Format umgewandelt.
export type IngredientDraft = {
  name: string;
  quantity: string; // String, weil TextInput nur Strings liefert
  unit: string;
  notes: string;
  // BLS-Code des gewählten Lebensmittels (für exakte Nährwerte), oder null
  // bei einer frei eingetippten Zutat.
  blsCode?: string | null;
};

type Props = {
  value: IngredientDraft[];
  onChange: (next: IngredientDraft[]) => void;
};

export function IngredientList({ value, onChange }: Props) {
  function update(index: number, patch: Partial<IngredientDraft>) {
    const next = [...value];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  // Name + zugehöriger BLS-Code kommen zusammen aus dem Autocomplete.
  // blsCode ist null, wenn der User eine eigene (freie) Zutat eingetippt hat.
  function setNameForRow(index: number, name: string, blsCode: string | null) {
    const next = [...value];
    next[index] = { ...next[index], name, blsCode };
    onChange(next);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([
      ...value,
      { name: "", quantity: "", unit: "", notes: "", blsCode: null },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Zutaten</Text>

      {value.length === 0 ? (
        <Text style={styles.empty}>
          Noch keine Zutaten. Tippe auf „+ Zutat hinzufügen".
        </Text>
      ) : (
        value.map((ing, idx) => (
          <View key={idx} style={styles.row}>
            <TextInput
              value={ing.quantity}
              onChangeText={(t) => update(idx, { quantity: t })}
              placeholder="200"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[styles.input, styles.qty]}
            />
            <TextInput
              value={ing.unit}
              onChangeText={(t) => update(idx, { unit: t })}
              placeholder="g"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.unit]}
            />
            <View style={styles.name}>
              <IngredientNameInput
                value={ing.name}
                onChange={(n, code) => setNameForRow(idx, n, code)}
                placeholder="z.B. Apfel"
              />
            </View>
            <Pressable
              onPress={() => remove(idx)}
              hitSlop={8}
              style={styles.removeButton}
              accessibilityLabel={`Zutat ${idx + 1} entfernen`}
            >
              <Text style={styles.removeIcon}>✕</Text>
            </Pressable>
          </View>
        ))
      )}

      <Pressable onPress={addRow} style={styles.addButton}>
        <Text style={styles.addButtonText}>＋ Zutat hinzufügen</Text>
      </Pressable>
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
  empty: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: "italic",
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    height: 40,
    outlineStyle: "none" as never,
  },
  qty: {
    width: 60,
    textAlign: "right",
  },
  unit: {
    width: 60,
  },
  name: {
    flex: 1,
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  removeIcon: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  addButton: {
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    marginTop: spacing.xs,
  },
  addButtonText: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.sm,
  },
});
