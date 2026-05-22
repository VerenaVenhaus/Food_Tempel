// Hauptseite — Rezeptliste alphabetisch, mit Suche und Filter.

import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { RecipeCard } from "../components/RecipeCard";
import { SearchBar } from "../components/SearchBar";
import { filterRecipes } from "../db/repositories";
import type { Recipe } from "../db/schema";
import type { RootStackParamList } from "../navigation/types";
import { useFilter } from "../state/FilterContext";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { filter, setFilter, resetFilter, activeCount, refreshKey } = useFilter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  // Bei jedem Fokus + Filter/Suche-Änderung neu laden
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const list = await filterRecipes({
          search: filter.search,
          mealTypes: filter.mealType ? [filter.mealType] : undefined,
          cuisines: filter.cuisines.length > 0 ? filter.cuisines : undefined,
          tagIds: filter.tagIds.length > 0 ? filter.tagIds : undefined,
          ingredientNames:
            filter.ingredientNames.length > 0 ? filter.ingredientNames : undefined,
          maxCalories: filter.maxCalories,
          minProtein: filter.minProtein,
        });
        if (active) {
          setRecipes(list);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [filter, refreshKey]),
  );

  return (
    <View style={styles.container}>
      <SearchBar
        value={filter.search}
        onChangeText={(text) => setFilter({ ...filter, search: text })}
        onFilterPress={() => navigation.navigate("Filter")}
        filterBadge={activeCount}
      />

      {/* Aktive-Filter-Anzeige + Reset */}
      {activeCount > 0 && (
        <View style={styles.activeBar}>
          <Text style={styles.activeText}>
            {activeCount} Filter aktiv ·{" "}
            <Text style={styles.activeCount}>{recipes.length} Treffer</Text>
          </Text>
          <Pressable onPress={resetFilter} hitSlop={8}>
            <Text style={styles.resetText}>Zurücksetzen</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <Text style={styles.empty}>Lade Rezepte…</Text>
      ) : recipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{activeCount > 0 ? "🔍" : "📖"}</Text>
          <Text style={styles.emptyTitle}>
            {activeCount > 0 ? "Keine Treffer" : "Noch keine Rezepte"}
          </Text>
          <Text style={styles.emptyHint}>
            {activeCount > 0
              ? "Lockere deine Filter oder lege ein passendes Rezept an."
              : 'Tippe rechts oben auf "+", um dein erstes Rezept anzulegen.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          // Performance-Tuning bei langen Listen
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          renderItem={({ item }) => (
            <RecipeCard
              title={item.title}
              imageUri={item.imageUri}
              mealType={item.mealType}
              prepTimeMinutes={item.prepTimeMinutes}
              cookTimeMinutes={item.cookTimeMinutes}
              onPress={() =>
                navigation.navigate("RecipeDetail", { recipeId: item.id })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  empty: {
    textAlign: "center",
    padding: spacing.xl,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
  activeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    // Grün-Pendant zum Filter-Knopf — signalisiert "Auswahl/Filter aktiv".
    backgroundColor: colors.freshLight,
    borderRadius: radius.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  activeText: {
    fontSize: fontSize.sm,
    color: colors.freshDark,
  },
  activeCount: {
    fontWeight: fontWeight.semibold,
  },
  resetText: {
    color: colors.freshDark,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
});
