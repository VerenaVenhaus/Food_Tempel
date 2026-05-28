// Detail-Ansicht eines einzelnen Rezepts.
// Erhält die Rezept-ID über die Navigation-Parameter (siehe navigation/types.ts).

import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useLayoutEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  deleteRecipe,
  getRecipeById,
  type RecipeWithDetails,
} from "../db/repositories";
import { backupSingleRecipeToCloud } from "../lib/cloudSync";
import { CUISINE_LABEL_BY_VALUE } from "../data/cuisines";
import { DRINK_LABEL_BY_VALUE } from "../data/drinkTypes";
import { MEAL_LABEL_BY_VALUE } from "../data/mealTypes";
import { shareRecipe } from "../lib/share";
import type { RootStackParamList } from "../navigation/types";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeDetail">;

// Reihenfolge, in der die Tag-Kategorien als eigene Zeilen erscheinen.
// Spiegelt die Anordnung im FilterScreen, damit User-Erwartung konsistent bleibt.
const TAG_CATEGORY_ORDER = [
  "diet",
  "health",
  "allergen",
  "taste",
  "alcohol",
  "occasion",
] as const;

// Komma-separierte DB-Strings ("breakfast,snack") in ein Array lesbarer
// Labels umwandeln, z.B. ["Frühstück", "Snack"]. Pro Eintrag ein eigener
// "Pill"-Badge in der Anzeige.
function labelArray(
  raw: string | null | undefined,
  lookup: Record<string, string>,
): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => lookup[v] ?? v);
}

export function RecipeDetailScreen({ navigation, route }: Props) {
  const { recipeId } = route.params;
  const [recipe, setRecipe] = useState<RecipeWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // useFocusEffect statt useEffect — wird auch nach Rückkehr vom Edit-Screen
  // ausgeführt, damit Änderungen sofort sichtbar sind.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const data = await getRecipeById(recipeId);
        setRecipe(data);
        setLoading(false);
      })();
    }, [recipeId]),
  );

  function confirmDelete() {
    Alert.alert(
      "Rezept löschen?",
      "Das Rezept wird endgültig entfernt. Diese Aktion kann nicht rückgängig gemacht werden.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            await deleteRecipe(recipeId);
            navigation.goBack();
          },
        },
      ],
    );
  }

  async function handleShare() {
    if (!recipe) return;
    try {
      await shareRecipe(recipe);
    } catch (err) {
      Alert.alert(
        "Teilen fehlgeschlagen",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async function handleBackupSingle() {
    try {
      await backupSingleRecipeToCloud(recipeId);
      Alert.alert("Gesichert", "Dieses Rezept liegt jetzt in deiner Cloud.");
    } catch (err) {
      Alert.alert(
        "Backup fehlgeschlagen",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // Header-Buttons: Teilen + Bearbeiten + Löschen
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleShare}
            hitSlop={8}
            accessibilityLabel="Rezept teilen"
          >
            <Text style={styles.headerAction}>↗</Text>
          </Pressable>
          <Pressable
            onPress={handleBackupSingle}
            hitSlop={8}
            accessibilityLabel="Dieses Rezept in Cloud sichern"
          >
            <Text style={styles.headerAction}>☁️</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("RecipeForm", { editId: recipeId })}
            hitSlop={8}
            accessibilityLabel="Rezept bearbeiten"
          >
            <Text style={styles.headerAction}>✎</Text>
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            hitSlop={8}
            accessibilityLabel="Rezept löschen"
          >
            <Text style={[styles.headerAction, styles.headerActionDanger]}>🗑</Text>
          </Pressable>
        </View>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, recipeId, recipe]);

  if (loading) {
    return <Text style={styles.loading}>Lade…</Text>;
  }
  if (!recipe) {
    return <Text style={styles.loading}>Rezept nicht gefunden.</Text>;
  }

  // Anleitung als Liste (jede Zeile = ein Schritt)
  const steps = recipe.instructions
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {recipe.imageUri ? (
        <Image source={{ uri: recipe.imageUri }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>🍽️</Text>
        </View>
      )}

      <Text style={styles.title}>{recipe.title}</Text>

      {recipe.description && (
        <Text style={styles.description}>{recipe.description}</Text>
      )}

      {/* Meta-Zeile: Zeiten + Portionen */}
      <View style={styles.metaRow}>
        {recipe.prepTimeMinutes != null && (
          <MetaItem label="Vorbereitung" value={`${recipe.prepTimeMinutes} Min`} />
        )}
        {recipe.cookTimeMinutes != null && (
          <MetaItem label="Kochen" value={`${recipe.cookTimeMinutes} Min`} />
        )}
        {recipe.servings != null && (
          <MetaItem label="Portionen" value={`${recipe.servings}`} />
        )}
      </View>

      {/* Mahlzeit-Typ(en) — eigene Zeile in primary-Farbe. */}
      {recipe.mealType && (
        <View style={styles.tagRow}>
          {labelArray(recipe.mealType, {
            ...MEAL_LABEL_BY_VALUE,
            ...DRINK_LABEL_BY_VALUE,
          }).map((label, i) => (
            <View key={`meal-${i}`} style={styles.tag}>
              <Text style={styles.tagText}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Küche / Land — eigene Zeile in neutraler Optik (wie "Anlass"),
          weil Herkunft/Land eher ein "Kontext"-Tag ist und nicht
          farblich konkurrieren soll. */}
      {recipe.cuisine && (
        <View style={styles.tagRow}>
          {labelArray(recipe.cuisine, CUISINE_LABEL_BY_VALUE).map((label, i) => (
            <View
              key={`cuisine-${i}`}
              style={[styles.tag, styles.tagOccasionBg]}
            >
              <Text style={[styles.tagText, styles.tagOccasionFg]}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tags nach Kategorie in eigene Zeilen — jede Kategorie hat ihre
          eigene Farbe. Reihenfolge wie im Filter-Modal. */}
      {TAG_CATEGORY_ORDER.map((category) => {
        const tagsOfCategory = recipe.tags.filter((t) => t.category === category);
        if (tagsOfCategory.length === 0) return null;
        const cs = TAG_STYLES_BY_CATEGORY[category];
        return (
          <View key={category} style={styles.tagRow}>
            {tagsOfCategory.map((t) => (
              <View key={t.id} style={[styles.tag, cs.bg]}>
                <Text style={[styles.tagText, cs.fg]}>{t.name}</Text>
              </View>
            ))}
          </View>
        );
      })}

      {/* Zutaten */}
      <Text style={styles.sectionTitle}>Zutaten</Text>
      {recipe.ingredients.length === 0 ? (
        <Text style={styles.muted}>Keine Zutaten angegeben.</Text>
      ) : (
        recipe.ingredients.map((ing) => (
          <View key={ing.id} style={styles.ingredientRow}>
            <Text style={styles.ingredientQty}>
              {ing.quantity != null ? ing.quantity : ""}
              {ing.unit ? ` ${ing.unit}` : ""}
            </Text>
            <Text style={styles.ingredientName}>
              {ing.name}
              {ing.notes ? `, ${ing.notes}` : ""}
            </Text>
          </View>
        ))
      )}

      {/* Nährwerte (optional) */}
      {recipe.nutrition && (
        <>
          <Text style={styles.sectionTitle}>Nährwerte (pro Portion)</Text>
          <View style={styles.nutritionGrid}>
            <NutritionCell label="Kalorien" value={recipe.nutrition.calories} unit="kcal" />
            <NutritionCell label="Protein" value={recipe.nutrition.proteinG} unit="g" />
            <NutritionCell label="Kohlenhydrate" value={recipe.nutrition.carbsG} unit="g" />
            <NutritionCell label="Fett" value={recipe.nutrition.fatG} unit="g" />
            <NutritionCell label="Ballaststoffe" value={recipe.nutrition.fiberG} unit="g" />
            <NutritionCell label="Zucker" value={recipe.nutrition.sugarG} unit="g" />
          </View>
        </>
      )}

      {/* Anleitung */}
      <Text style={styles.sectionTitle}>Zubereitung</Text>
      {steps.length === 0 ? (
        <Text style={styles.muted}>Keine Anleitung angegeben.</Text>
      ) : (
        steps.map((step, idx) => (
          <View key={idx} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{idx + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// Zelle in der Nährwert-Tabelle. Zeigt nichts, wenn kein Wert da ist.
function NutritionCell({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  if (value == null) return null;
  return (
    <View style={styles.nutritionCell}>
      <Text style={styles.nutritionValue}>
        {value} <Text style={styles.nutritionUnit}>{unit}</Text>
      </Text>
      <Text style={styles.nutritionLabel}>{label}</Text>
    </View>
  );
}

// Kleine wiederverwendbare Komponente für die Meta-Zeile
function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loading: {
    padding: spacing.xl,
    textAlign: "center",
    color: colors.textSecondary,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  imagePlaceholder: {
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: 80,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  metaItem: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  metaLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    // Abstand zur nächsten Kategorie-Zeile = gleicher kleiner Abstand wie
    // der Wrap-Abstand innerhalb einer Kategorie. So sehen alle Lücken
    // gleich aus, egal ob zwischen Kategorien oder beim Umbruch in einer.
    marginBottom: spacing.xs,
  },
  tag: {
    // Default-Hülle: Mahlzeit + Küche bleiben in Karotten-Orange.
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.primaryDark,
    fontWeight: fontWeight.medium,
  },
  // --- Kategorie-spezifische Farben für die Tag-Zeilen ---
  // Ernährungsform → Teal
  tagDietBg: { backgroundColor: colors.accentLight },
  tagDietFg: { color: colors.accent },
  // Gesundheit → Frischgrün
  tagHealthBg: { backgroundColor: colors.freshLight },
  tagHealthFg: { color: colors.freshDark },
  // Allergene → Warnrot (sanftes Lachs als Hintergrund + danger als Text)
  tagAllergenBg: { backgroundColor: "#fadbd5" },
  tagAllergenFg: { color: "#721e0d" },
  // Geschmack → Mintgrün (heller als Frischgrün, leichter Mint-Stich)
  tagTasteBg: { backgroundColor: "#fcf7c8" },
  tagTasteFg: { color: "#968a21"  },
  // Alkohol → warmes Honiggelb
  tagAlcoholBg: { backgroundColor: "#fbe7c8" },
  tagAlcoholFg: { color: "#7a4f01" },
  // Anlass → neutraler Hintergrund
  tagOccasionBg: { backgroundColor: colors.surface },
  tagOccasionFg: { color: colors.textSecondary },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  ingredientRow: {
    flexDirection: "row",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ingredientQty: {
    width: 80,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  ingredientName: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  stepRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#fff",
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  stepText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  muted: {
    color: colors.textMuted,
    fontStyle: "italic",
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  nutritionCell: {
    width: "31%",
    backgroundColor: colors.freshLight,
    padding: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    gap: 2,
  },
  nutritionValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.freshDark,
  },
  nutritionUnit: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
  },
  nutritionLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm, // etwas enger weil jetzt 4 Icons
    alignItems: "center",
  },
  headerAction: {
    fontSize: 22,
    color: colors.primary,
  },
  headerActionDanger: {
    color: colors.danger,
  },
});

// Mapping Kategorie → (Hintergrund, Schriftfarbe) für die Tag-Pills.
// Liegt außerhalb von styles.create, damit wir auf die fertigen Style-Objekte
// zeigen können (TypeScript-mäßig sauberer als Object-Literale inline).
const TAG_STYLES_BY_CATEGORY: Record<
  string,
  { bg: object; fg: object }
> = {
  diet: { bg: styles.tagDietBg, fg: styles.tagDietFg },
  health: { bg: styles.tagHealthBg, fg: styles.tagHealthFg },
  allergen: { bg: styles.tagAllergenBg, fg: styles.tagAllergenFg },
  taste: { bg: styles.tagTasteBg, fg: styles.tagTasteFg },
  alcohol: { bg: styles.tagAlcoholBg, fg: styles.tagAlcoholFg },
  occasion: { bg: styles.tagOccasionBg, fg: styles.tagOccasionFg },
};
