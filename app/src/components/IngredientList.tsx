// Editor für die Zutaten-Liste eines Rezepts.
// Jede Zeile = eine Zutat (Menge + Einheit + Name). Reihenfolge wird beim
// Speichern als sortOrder verwendet.

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { listIngredients } from "../db/repositories";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";
import { IngredientNameInput } from "./IngredientNameInput";

// Datentyp, mit dem das Formular intern arbeitet. Beim Speichern wird das
// in das Repository-Format umgewandelt.
export type IngredientDraft = {
  name: string;
  quantity: string; // String, weil TextInput nur Strings liefert
  unit: string;
  notes: string;
};

type Props = {
  value: IngredientDraft[];
  onChange: (next: IngredientDraft[]) => void;
};

export function IngredientList({ value, onChange }: Props) {
  // Bereits in der DB erfasste Zutat-Namen — als Quelle für den Autocomplete,
  // damit der User konsistent benannte Zutaten wiederfindet.
  const [knownNames, setKnownNames] = useState<string[]>([]);
  useEffect(() => {
    listIngredients()
      .then((items) => setKnownNames(items.map((i) => i.name)))
      .catch(() => {
        // Wenn die DB hier nicht erreichbar ist, ist das egal — der Autocomplete
        // hat noch die bundled Liste als Fallback.
      });
  }, []);

  function update(index: number, patch: Partial<IngredientDraft>) {
    const next = [...value];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  // Name wurde aus dem Autocomplete gewählt. Wenn die Zutat eine Default-
  // Einheit kennt UND der User noch keine eigene Einheit eingetippt hat,
  // belegen wir sie vor — sonst lassen wir die bestehende Einheit stehen.
  function setNameForRow(index: number, name: string, suggestedUnit?: string) {
    const current = value[index];
    const next = [...value];
    next[index] = {
      ...current,
      name,
      unit: current.unit.trim().length === 0 && suggestedUnit
        ? suggestedUnit
        : current.unit,
    };
    onChange(next);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...value, { name: "", quantity: "", unit: "", notes: "" }]);
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
                onChange={(n, suggestedUnit) =>
                  setNameForRow(idx, n, suggestedUnit)
                }
                placeholder="Mehl"
                knownNames={knownNames}
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
