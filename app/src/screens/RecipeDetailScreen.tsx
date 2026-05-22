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
import { shareRecipe } from "../lib/share";
import type { RootStackParamList } from "../navigation/types";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeDetail">;

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Frühstück",
  lunch: "Mittag",
  dinner: "Abend",
  snack: "Snack",
  dessert: "Dessert",
};

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

      {/* Mahlzeit-Typ + Küche */}
      {(recipe.mealType || recipe.cuisine) && (
        <View style={styles.tagRow}>
          {recipe.mealType && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {MEAL_LABELS[recipe.mealType] ?? recipe.mealType}
              </Text>
            </View>
          )}
          {recipe.cuisine && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{recipe.cuisine}</Text>
            </View>
          )}
          {recipe.tags.map((t) => (
            <View key={t.id} style={[styles.tag, styles.dietTag]}>
              <Text style={[styles.tagText, styles.dietTagText]}>{t.name}</Text>
            </View>
          ))}
        </View>
      )}

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
    marginBottom: spacing.md,
  },
  tag: {
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
  dietTag: {
    backgroundColor: colors.accentLight,
  },
  dietTagText: {
    color: colors.accent,
  },
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
    gap: spacing.md,
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
