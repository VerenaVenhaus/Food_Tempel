// Filter-Modal — der User wählt Mahlzeit, Küchen, Tags und Zutaten.
// Beim "Anwenden" schreiben wir den Filter in den globalen FilterContext
// und schließen das Modal. Die HomeScreen-Liste reagiert dann automatisch.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useLayoutEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SelectChips } from "../components/SelectChips";
import { listIngredients, listTags } from "../db/repositories";
import type { Ingredient, Tag } from "../db/schema";
import type { RootStackParamList } from "../navigation/types";
import { EMPTY_FILTER, type RecipeFilterState, useFilter } from "../state/FilterContext";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Filter">;

type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "dessert";

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Frühstück" },
  { value: "lunch", label: "Mittag" },
  { value: "dinner", label: "Abend" },
  { value: "snack", label: "Snack" },
  { value: "dessert", label: "Dessert" },
];

const CUISINE_OPTIONS = [
  { value: "german", label: "Deutschland" },
  { value: "italian", label: "Italien" },
  { value: "french", label: "Frankreich" },
  { value: "spanish", label: "Spanien" },
  { value: "greek", label: "Griechenland" },
  { value: "turkish", label: "Türkei" },
  { value: "chinese", label: "China" },
  { value: "japanese", label: "Japan" },
  { value: "indian", label: "Indien" },
  { value: "mexican", label: "Mexiko" },
  { value: "american", label: "USA" },
  { value: "other", label: "Sonstige" },
];

const TAG_CATEGORY_LABELS: Record<string, string> = {
  diet: "Ernährungsform",
  health: "Gesundheit",
  allergen: "Allergene",
  occasion: "Anlass",
};

export function FilterScreen({ navigation }: Props) {
  const { filter, setFilter, resetFilter } = useFilter();

  // Lokaler Draft — Änderungen werden erst beim "Anwenden" in den Context
  // geschrieben. So kann der User mit "Abbrechen" zurück ohne Änderung.
  const [draft, setDraft] = useState<RecipeFilterState>(filter);
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, Tag[]>>({});
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    (async () => {
      const [tags, ings] = await Promise.all([listTags(), listIngredients()]);
      const grouped: Record<string, Tag[]> = {};
      for (const t of tags) {
        (grouped[t.category] ||= []).push(t);
      }
      setTagsByCategory(grouped);
      setAllIngredients(ings);
    })();
  }, []);

  // Header: "Zurücksetzen"-Button oben rechts
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => {
            setDraft(EMPTY_FILTER);
          }}
          hitSlop={12}
        >
          <Text style={styles.headerAction}>Zurücksetzen</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  function apply() {
    setFilter(draft);
    navigation.goBack();
  }

  function resetAndApply() {
    resetFilter();
    navigation.goBack();
  }

  const ingredientOptions = allIngredients.map((i) => ({
    value: i.name, // wir filtern per Name, nicht per ID
    label: i.name,
  }));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Mahlzeit">
          <SelectChips
            options={MEAL_OPTIONS}
            value={draft.mealType as MealType | null}
            onChange={(v) => setDraft({ ...draft, mealType: v })}
          />
        </Section>

        <Section title="Küche / Land">
          <SelectChips
            options={CUISINE_OPTIONS}
            value={draft.cuisines}
            onChange={(v) => setDraft({ ...draft, cuisines: v })}
            multiSelect
          />
        </Section>

        {Object.entries(tagsByCategory).map(([category, items]) => (
          <Section
            key={category}
            title={TAG_CATEGORY_LABELS[category] ?? category}
          >
            <SelectChips
              options={items.map((t) => ({ value: t.id, label: t.name }))}
              value={draft.tagIds}
              onChange={(v) => setDraft({ ...draft, tagIds: v })}
              multiSelect
            />
          </Section>
        ))}

        {ingredientOptions.length > 0 && (
          <Section
            title="Zutaten enthalten"
            subtitle={`"Was kann ich kochen?" — Rezepte, die ALLE markierten Zutaten enthalten`}
          >
            <SelectChips
              options={ingredientOptions}
              value={draft.ingredientNames}
              onChange={(v) => setDraft({ ...draft, ingredientNames: v })}
              multiSelect
            />
          </Section>
        )}
      </ScrollView>

      {/* Sticky Apply-Bar unten */}
      <View style={styles.applyBar}>
        <Pressable onPress={resetAndApply} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>Alle löschen</Text>
        </Pressable>
        <Pressable onPress={apply} style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Anwenden</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      {children}
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
    gap: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  applyBar: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  resetButtonText: {
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  applyButton: {
    flex: 2,
    backgroundColor: colors.fresh,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  headerAction: {
    color: colors.freshDark,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.sm,
  },
});
