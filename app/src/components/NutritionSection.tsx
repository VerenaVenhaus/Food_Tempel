// Nährwerte-Sektion für das Rezept-Formular.
//
// Zwei Wege, Werte einzutragen:
//   1. Manuell — jeder Wert in seinem TextInput
//   2. "Aus Zutaten berechnen" — Zutaten mit BLS-Code werden lokal aus dem
//      Bundeslebensmittelschlüssel gerechnet (exakt, offline); für Zutaten
//      ohne Code holt das Backend Werte bei Open Food Facts nach.

import { useEffect, useRef, useState } from "react";
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
  // blsCode (optional) ermöglicht die exakte lokale Nährwert-Berechnung.
  ingredients: Array<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    blsCode?: string | null;
  }>;
  servings: number;
  // Beim Bearbeiten eines existierenden Rezepts: für wie viele Portionen
  // sind die geladenen Nährwerte berechnet? Wir merken uns das und können
  // dann beim Portionen-Ändern korrekt rescalen. Null = Werte unbekannt /
  // neu angelegtes Rezept (Auto-Skalierung greift dann erst nach "Aus
  // Zutaten berechnen").
  initialComputedForServings?: number | null;
};

export function NutritionSection({
  value,
  onChange,
  ingredients,
  servings,
  initialComputedForServings,
}: Props) {
  const [calculating, setCalculating] = useState(false);

  // Für welche Portionsanzahl wurden die aktuellen Werte berechnet?
  // Wir merken's uns als Ref, damit wir beim Portionen-Ändern automatisch
  // umrechnen können (ohne erneut die API zu rufen). Werte sind pro Portion,
  // also reicht reine Mathematik: pp_neu = pp_alt × alteServings / neueServings.
  const computedForServingsRef = useRef<number | null>(null);

  // Beim Bearbeiten eines existierenden Rezepts kommen Nährwerte und
  // Portionen über Props rein. Wir initialisieren die Ref einmalig, sobald
  // der Parent uns einen Wert mitteilt. Manuelle Edits danach setzen die
  // Ref auf null (siehe setField) — auto-skalierung wird dann deaktiviert,
  // bis erneut "Aus Zutaten berechnen" geklickt wird.
  useEffect(() => {
    if (
      initialComputedForServings != null &&
      initialComputedForServings > 0 &&
      computedForServingsRef.current == null
    ) {
      computedForServingsRef.current = initialComputedForServings;
    }
  }, [initialComputedForServings]);
  // Damit wir wissen, ob sich `servings` seit dem letzten Render geändert hat.
  const prevServingsRef = useRef<number>(servings);
  // Aktuelle value-Snapshot in einer Ref, damit der servings-Effect kein
  // value im Dependency-Array braucht (sonst Endlosschleife).
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Wenn sich die Portionen ändern UND wir Werte für eine andere Portionsanzahl
  // berechnet hatten, skalieren wir die angezeigten Nährwerte automatisch.
  useEffect(() => {
    const prev = prevServingsRef.current;
    prevServingsRef.current = servings;

    if (computedForServingsRef.current == null) return;
    if (servings <= 0 || prev <= 0) return;
    if (servings === computedForServingsRef.current) return;

    const factor = computedForServingsRef.current / servings;
    const v = valueRef.current;
    const scaled: NutritionDraft = {
      calories: scaleString(v.calories, factor),
      proteinG: scaleString(v.proteinG, factor),
      carbsG: scaleString(v.carbsG, factor),
      fatG: scaleString(v.fatG, factor),
      fiberG: scaleString(v.fiberG, factor),
      sugarG: scaleString(v.sugarG, factor),
    };
    onChange(scaled);
    computedForServingsRef.current = servings;
    // `onChange` ist über Props rein — wenn der Parent es stabil hält (useCallback
    // oder Setter aus useState), löst es keine Re-Renders aus. Wir lassen die
    // Lint-Warnung in Kauf, weil das Dependency hier semantisch falsch wäre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servings]);

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
    // Merken, für wie viele Portionen das hier gerade berechnet wurde.
    // Wenn der User die Portionen später ändert, skalieren wir automatisch.
    computedForServingsRef.current = servings || 1;

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
    // Manuelle Eingabe → ab jetzt nicht mehr auto-skalieren, wenn die
    // Portionen geändert werden. Wer von Hand tippt, will seinen Wert behalten.
    // Nach dem nächsten "Aus Zutaten berechnen" wird das wieder aktiviert.
    computedForServingsRef.current = null;
    onChange({ ...value, [key]: sanitized });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Nährwerte pro Portion. Du kannst sie manuell eintragen oder aus den
        Zutaten berechnen lassen (Quelle: Bundeslebensmittelschlüssel; Open
        Food Facts als Fallback für frei eingetippte Zutaten).
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

// Skaliert einen Zahl-String mit einem Faktor. Leere Strings + ungültige
// Eingaben werden unverändert zurückgegeben. Komma wird als Dezimaltrenner
// akzeptiert ("12,5" → 12.5).
function scaleString(s: string, factor: number): string {
  if (!s || s.trim() === "") return s;
  const n = parseFloat(s.replace(",", "."));
  if (Number.isNaN(n)) return s;
  const scaled = n * factor;
  // Auf 1 Nachkommastelle runden — 200 bleibt 200, 200.45 wird 200.5
  const rounded = Math.round(scaled * 10) / 10;
  return String(rounded);
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
