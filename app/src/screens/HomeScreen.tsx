// Hauptseite — Rezeptliste alphabetisch, mit Suche und Filter.

import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RecipeCard } from "../components/RecipeCard";
import { SearchBar } from "../components/SearchBar";
import { COUNTRIES } from "../data/cuisines";
import { filterRecipes } from "../db/repositories";
import type { Recipe } from "../db/schema";
import type { RootStackParamList } from "../navigation/types";
import { useFilter } from "../state/FilterContext";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { filter, setFilter, resetFilter, setKind, activeCount, refreshKey } =
    useFilter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  // Bottom safe-area-Inset: auf iOS Geräten mit Home-Indikator-Linie, damit
  // die Tab-Bar nicht von der System-UI überlappt wird.
  const insets = useSafeAreaInsets();

  // Bei jedem Fokus + Filter/Suche-Änderung neu laden
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        // Effektive Länder-Liste fürs Filtern:
        //   1. Explizite Länder gewählt → nimm die
        //   2. Sonst: nur Kontinente gewählt → alle Länder der Kontinente
        //   3. Sonst: kein Cuisine-Filter
        let effectiveCuisines: string[] | undefined;
        if (filter.cuisines.length > 0) {
          effectiveCuisines = filter.cuisines;
        } else if (filter.continents.length > 0) {
          // Bei Kontinent-Filter: passende Länder UND die Kontinent-Werte
          // selbst — damit Rezepte mit nur Kontinent in der cuisine-Spalte
          // (kein Land gewählt) ebenfalls gefunden werden.
          effectiveCuisines = [
            ...filter.continents,
            ...COUNTRIES.filter((c) =>
              filter.continents.includes(c.continent),
            ).map((c) => c.value),
          ];
        }

        const list = await filterRecipes({
          kind: filter.kind,
          search: filter.search,
          mealTypes: filter.mealTypes.length > 0 ? filter.mealTypes : undefined,
          cuisines: effectiveCuisines,
          tagIds: filter.tagIds.length > 0 ? filter.tagIds : undefined,
          excludedTagIds:
            filter.excludedTagIds.length > 0 ? filter.excludedTagIds : undefined,
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
            {activeCount > 0
              ? "Keine Treffer"
              : filter.kind === "drink"
                ? "Noch keine Getränke"
                : "Noch keine Rezepte"}
          </Text>
          <Text style={styles.emptyHint}>
            {activeCount > 0
              ? "Lockere deine Filter oder lege ein passendes Rezept an."
              : filter.kind === "drink"
                ? 'Tippe rechts oben auf "+", um dein erstes Getränk anzulegen.'
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
              // Nur die echte Kurzbeschreibung — die ausführliche bleibt
              // bewusst draußen, damit die Karte nicht überladen wirkt.
              shortDescription={item.shortDescription}
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

      {/* Bottom-Tab-Bar — Doppelschicht:
          - Außen: weißer "Safe-Area-Sockel" → übergeht visuell sauber in die
            Android-System-Nav-Bar darunter.
          - Innen: die eigentliche Tab-Bar mit dem Beige-Grün der Navbar. */}
      <View style={[styles.tabBarSafe, { paddingBottom: insets.bottom }]}>
        <View style={styles.tabBar}>
          <Tab
            label="🍽️ Essen"
            active={filter.kind === "food"}
            onPress={() => setKind("food")}
          />
          <Tab
            label="🥤 Getränke"
            active={filter.kind === "drink"}
            onPress={() => setKind("drink")}
          />
        </View>
      </View>
    </View>
  );
}

// Einzelner Tab. Aktiv-Indikator ist ein absolut positionierter Strich am
// unteren Rand — überlappt die Trennlinie der Tab-Bar.
function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
      {active && <View style={styles.tabIndicator} />}
    </Pressable>
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
  // Äußere Hülle der Tab-Bar — füllt den Safe-Area-Bereich unter den Tabs
  // in Weiß, sodass es einen sauberen Übergang zur (weißen/hellen) Android-
  // System-Nav-Bar darunter gibt.
  tabBarSafe: {
    backgroundColor: "#fff",
  },
  // Die eigentliche Tab-Bar (visible row): Grün wie die Navbar.
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.navbarBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    // Leichte Umrandung in Grau — gibt jedem Reiter eine eigene Zelle.
    // Oben kommt die border-top der Tab-Bar hinzu, deshalb hier nur
    // bottom + left + right.
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  tabPressed: {
    opacity: 0.6,
  },
  tabLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  // Aktiv-Indikator: 3px-Strich am oberen Rand. -1px Top → liegt direkt
  // auf der grauen Trennlinie der Tab-Bar, "zeigt" damit hoch zum Inhalt.
  tabIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -1,
    height: 3,
    backgroundColor: colors.primary,
  },
});
