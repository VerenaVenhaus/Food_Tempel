// Nährwerte-Sektion für das Rezept-Formular.
//
// Zwei Wege, Werte einzutragen:
//   1. Manuell — jeder Wert in seinem TextInput
//   2. "Aus Zutaten berechnen" — schickt Zutaten an das Backend, das
//      bei Open Food Facts nachschaut und Werte zurückgibt
//
// Beim Backend-Aufruf brauchen wir die aktuellen Zutaten und Portionen aus
// dem Parent — werden als Props reingegeben.

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { calculateNutrition } from "../lib/api";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

// Datentyp, mit dem das Formular intern arbeitet — Strings, weil TextInput
// nur Strings liefert. Beim Speichern in die DB zu Number parsen.
export type NutritionDraft = {
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fiberG: string;
  sugarG: string;
};

export const EMPTY_NUTRITION: NutritionDraft = {
  calories: "",
  proteinG: "",
  carbsG: "",
  fatG: "",
  fiberG: "",
  sugarG: "",
};

type Props = {
  value: NutritionDraft;
  onChange: (next: NutritionDraft) => void;
  // Vom Form übergeben, damit die Berechnung weiß was zu rechnen ist.
  ingredients: Array<{ name: string; quantity?: number | null; unit?: string | null }>;
  servings: number;
};

export function NutritionSection({ value, onChange, ingredients, servings }: Props) {
  const [calculating, setCalculating] = useState(false);

  async function autoCalculate() {
    const valid = ingredients.filter((i) => i.name.trim().length > 0);
    if (valid.length === 0) {
      Alert.alert(
        "Keine Zutaten",
        "Bitte trag erst Zutaten ein — die KI braucht sie als Grundlage.",
      );
      return;
    }
    setCalculating(true);
    const res = await calculateNutrition(valid, servings || 1);
    setCalculating(false);

    if (!res.ok) {
      Alert.alert("Berechnung fehlgeschlagen", res.error);
      return;
    }

    onChange({
      calories: String(res.data.calories),
      proteinG: String(res.data.proteinG),
      carbsG: String(res.data.carbsG),
      fatG: String(res.data.fatG),
      fiberG: String(res.data.fiberG),
      sugarG: String(res.data.sugarG),
    });

    if (res.data.missingIngredients.length > 0) {
      Alert.alert(
        "Teilweise berechnet",
        `Für diese Zutaten konnten keine Nährwerte gefunden werden:\n\n• ${res.data.missingIngredients.join("\n• ")}\n\nWerte sind also eine Untergrenze. Du kannst sie noch manuell anpassen.`,
      );
    }
  }

  function setField(key: keyof NutritionDraft, text: string) {
    // Nur Ziffern, Komma und Punkt zulassen
    const sanitized = text.replace(/[^0-9.,]/g, "");
    onChange({ ...value, [key]: sanitized });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Nährwerte pro Portion. Du kannst sie manuell eintragen oder von der
        KI aus den Zutaten berechnen lassen (Quelle: Open Food Facts).
      </Text>

      <Pressable
        onPress={autoCalculate}
        disabled={calculating}
        style={({ pressed }) => [
          styles.calcButton,
          (pressed || calculating) && styles.calcButtonPressed,
        ]}
      >
        {calculating ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.calcButtonText}>Berechne…</Text>
          </>
        ) : (
          <Text style={styles.calcButtonText}>🔬 Aus Zutaten berechnen</Text>
        )}
      </Pressable>

      <View style={styles.grid}>
        <NumField label="Kalorien (kcal)" value={value.calories} onChange={(t) => setField("calories", t)} />
        <NumField label="Protein (g)" value={value.proteinG} onChange={(t) => setField("proteinG", t)} />
        <NumField label="Kohlenhydrate (g)" value={value.carbsG} onChange={(t) => setField("carbsG", t)} />
        <NumField label="Fett (g)" value={value.fatG} onChange={(t) => setField("fatG", t)} />
        <NumField label="Ballaststoffe (g)" value={value.fiberG} onChange={(t) => setField("fiberG", t)} />
        <NumField label="Zucker (g)" value={value.sugarG} onChange={(t) => setField("sugarG", t)} />
      </View>
    </View>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="—"
        placeholderTextColor={colors.textMuted}
        style={styles.fieldInput}
        keyboardType="numeric"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  calcButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  calcButtonPressed: {
    opacity: 0.8,
  },
  calcButtonText: {
    color: "#fff",
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  field: {
    width: "47%",
    gap: 2,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  fieldInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    minHeight: 40,
    outlineStyle: "none" as never,
  },
});
