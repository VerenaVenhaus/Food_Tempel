// Filter-Modal — der User wählt Mahlzeit, Küchen, Tags und Zutaten.
// Beim "Anwenden" schreiben wir den Filter in den globalen FilterContext
// und schließen das Modal. Die HomeScreen-Liste reagiert dann automatisch.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { MultiSelectDropdown } from "../components/MultiSelectDropdown";
import { SelectChips } from "../components/SelectChips";
import { allergenInverseLabel } from "../data/allergenTags";
import {
  CONTINENT_OPTIONS,
  COUNTRIES,
  getContinentsForCountries,
} from "../data/cuisines";
import { DRINK_TYPE_OPTIONS } from "../data/drinkTypes";
import { MEAL_TYPE_OPTIONS } from "../data/mealTypes";
import { listIngredients, listTags } from "../db/repositories";
import type { Ingredient, Tag } from "../db/schema";
import type { RootStackParamList } from "../navigation/types";
import { EMPTY_FILTER, type RecipeFilterState, useFilter } from "../state/FilterContext";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Filter">;

const TAG_CATEGORY_LABELS: Record<string, string> = {
  diet: "Ernährungsform",
  health: "Gesundheit",
  allergen: "Allergene",
  taste: "Geschmacksrichtung",
  alcohol: "Alkohol",
  occasion: "Anlass",
};

// Reihenfolge der Tag-Sektionen. Categories, die hier nicht stehen, hängen
// wir hinten dran (für künftige Kategorien aus der DB, an die wir hier
// noch nicht denken).
const TAG_CATEGORY_ORDER = [
  "diet",
  "health",
  "allergen",
  "taste",
  "alcohol",
  "occasion",
];

// Ab wie vielen Tags eine Kategorie als Dropdown statt als Chip-Reihe
// dargestellt wird. Chips skalieren auf Mobil nicht — irgendwo zwischen
// 15 und 30 wird die Reihe unübersichtlich. 20 ist ein vernünftiger
// Mittelweg und macht das Verhalten zwischen den Kategorien konsistent.
const DROPDOWN_THRESHOLD = 20;

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
      // Innerhalb jeder Kategorie alphabetisch (deutsche Sortierung —
      // SQLite-Sort wäre case-sensitive ASCII, "Ä" landet sonst hinter "Z").
      for (const cat of Object.keys(grouped)) {
        grouped[cat].sort((a, b) =>
          a.name.localeCompare(b.name, "de", { sensitivity: "base" }),
        );
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

  // Filter-Optionen: die in den eigenen Rezepten tatsächlich vorkommenden
  // Zutaten (aus der DB), alphabetisch sortiert. Nach Zutaten zu filtern, die
  // in keinem Rezept vorkommen, würde ohnehin nichts finden.
  const ingredientOptions = useMemo(() => {
    return allIngredients
      .map((i) => i.name)
      .sort((a, b) => a.localeCompare(b, "de"))
      .map((name) => ({ value: name, label: name }));
  }, [allIngredients]);

  // Länder-Liste fürs Dropdown: IMMER alle, alphabetisch sortiert.
  // Der Kontinent ist nur ein "Mit-Tag", der bei Länder-Auswahl automatisch
  // dazukommt — er schränkt die Länderwahl NICHT mehr ein. Sonst hätte ein
  // User, der Deutschland gewählt hat (→ Europa auto-getaggt), keinen
  // Zugriff mehr auf Länder anderer Kontinente.
  const countryOptions = useMemo(
    () =>
      COUNTRIES.map((c) => ({ value: c.value, label: c.label })).sort(
        (a, b) => a.label.localeCompare(b.label, "de", { sensitivity: "base" }),
      ),
    [],
  );

  // Wenn der User Länder ändert, fügen wir die zugehörigen Kontinente
  // additiv hinzu (falls nicht schon drin). Bestehende Kontinente
  // bleiben unangetastet.
  function setCountries(next: string[]) {
    setDraft((prev) => {
      const derived = getContinentsForCountries(next);
      const merged = Array.from(new Set([...prev.continents, ...derived]));
      return { ...prev, cuisines: next, continents: merged };
    });
  }

  // Wenn der User Kontinente direkt ändert, lassen wir alles andere wie es
  // war. Insbesondere: bereits gewählte Länder bleiben drin, auch wenn der
  // User ihren Kontinent abwählt.
  function setContinents(next: string[]) {
    setDraft((prev) => ({ ...prev, continents: next }));
  }

  // Filter-Screen läuft im selben Modus wie die HomeScreen-Liste — der
  // aktuelle "Essen/Getränke"-Switch entscheidet über die hier angezeigten
  // Kategorien.
  const isDrink = filter.kind === "drink";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Section title={isDrink ? "Getränketyp" : "Mahlzeit"}>
          <SelectChips
            options={isDrink ? DRINK_TYPE_OPTIONS : MEAL_TYPE_OPTIONS}
            value={draft.mealTypes}
            onChange={(v) => setDraft({ ...draft, mealTypes: v })}
            multiSelect
          />
        </Section>

        <Section
          title="Küche / Land"
          subtitle="Beim Auswählen eines Lands wird der passende Kontinent automatisch dazu getaggt. Beide Listen sind unabhängig."
        >
          <MultiSelectDropdown
            options={CONTINENT_OPTIONS}
            value={draft.continents}
            onChange={setContinents}
            placeholder="Kontinent auswählen…"
            modalTitle="Kontinent"
            searchPlaceholder="Kontinent suchen…"
          />
          <View style={styles.cuisineCountryGap}>
            <MultiSelectDropdown
              options={countryOptions}
              value={draft.cuisines}
              onChange={setCountries}
              placeholder="Land auswählen…"
              modalTitle="Land"
              searchPlaceholder="Land suchen…"
            />
          </View>
        </Section>

        {orderedCategories(tagsByCategory)
          .filter(([category]) => (category === "alcohol" ? isDrink : true))
          .map(([category, items]) => {
          const title = TAG_CATEGORY_LABELS[category] ?? category;

          // Allergen-Sonderfall: die Tag-Namen sind positiv ("enthält-gluten"),
          // im Filter werden sie aber invertiert angezeigt ("glutenfrei") und
          // schreiben in excludedTagIds — d.h. Rezepte mit diesem Tag werden
          // ausgeblendet. So bleibt der Anlege-Vorgang einfach (nur tatsächlich
          // enthaltene Allergene markieren).
          if (category === "allergen") {
            const opts = items.map((t) => ({
              value: t.id,
              label: allergenInverseLabel(t.name),
            }));
            const useDropdown = items.length > DROPDOWN_THRESHOLD;
            return (
              <Section
                key={category}
                title={title}
                subtitle="Wähle, was im Rezept NICHT enthalten sein soll."
              >
                {useDropdown ? (
                  <MultiSelectDropdown
                    options={opts}
                    value={draft.excludedTagIds}
                    onChange={(v) => setDraft({ ...draft, excludedTagIds: v })}
                    placeholder={`${title} auswählen…`}
                    modalTitle={title}
                    searchPlaceholder={`${title} suchen…`}
                  />
                ) : (
                  <SelectChips
                    options={opts}
                    value={draft.excludedTagIds}
                    onChange={(v) => setDraft({ ...draft, excludedTagIds: v })}
                    multiSelect
                  />
                )}
              </Section>
            );
          }

          const opts = items.map((t) => ({ value: t.id, label: t.name }));
          // Bei >20 Tags pro Kategorie kippen wir auf das Dropdown — sonst
          // bleibt die Chip-Reihe, die für überschaubare Mengen schneller
          // zu bedienen ist (1 Tap statt 2).
          const useDropdown = items.length > DROPDOWN_THRESHOLD;

          return (
            <Section key={category} title={title}>
              {useDropdown ? (
                <MultiSelectDropdown
                  options={opts}
                  value={draft.tagIds}
                  onChange={(v) => setDraft({ ...draft, tagIds: v })}
                  placeholder={`${title} auswählen…`}
                  modalTitle={title}
                  searchPlaceholder={`${title} suchen…`}
                />
              ) : (
                <SelectChips
                  options={opts}
                  value={draft.tagIds}
                  onChange={(v) => setDraft({ ...draft, tagIds: v })}
                  multiSelect
                />
              )}
            </Section>
          );
        })}

        <Section
          title="Zutaten enthalten"
          subtitle={`"Was kann ich kochen?" — Rezepte, die ALLE markierten Zutaten enthalten`}
        >
          <MultiSelectDropdown
            options={ingredientOptions}
            value={draft.ingredientNames}
            onChange={(v) => setDraft({ ...draft, ingredientNames: v })}
            placeholder="Zutaten auswählen…"
            modalTitle="Zutaten auswählen"
            searchPlaceholder="Zutat suchen…"
            emptyMessage="Noch keine Zutaten erfasst. Sobald du Rezepte mit Zutaten anlegst, erscheinen sie hier."
          />
        </Section>

        <Section
          title="Nährwerte (pro Portion)"
          subtitle="Nur Rezepte mit erfassten Nährwerten erscheinen, wenn aktiv."
        >
          <View style={styles.nutritionRow}>
            <View style={styles.nutritionInput}>
              <Text style={styles.nutritionLabel}>max. Kalorien (kcal)</Text>
              <TextInput
                value={draft.maxCalories != null ? String(draft.maxCalories) : ""}
                onChangeText={(t) =>
                  setDraft({ ...draft, maxCalories: t.trim() ? Number(t) : null })
                }
                placeholder="z.B. 500"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.nutritionInput}>
              <Text style={styles.nutritionLabel}>min. Protein (g)</Text>
              <TextInput
                value={draft.minProtein != null ? String(draft.minProtein) : ""}
                onChangeText={(t) =>
                  setDraft({ ...draft, minProtein: t.trim() ? Number(t) : null })
                }
                placeholder="z.B. 20"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                keyboardType="numeric"
              />
            </View>
          </View>
        </Section>
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

// Sortiert die Tag-Kategorien nach TAG_CATEGORY_ORDER. Kategorien, die dort
// nicht aufgeführt sind (z.B. selbst angelegte), erscheinen am Ende
// alphabetisch.
function orderedCategories(
  groups: Record<string, Tag[]>,
): Array<[string, Tag[]]> {
  const known: Array<[string, Tag[]]> = [];
  const unknown: Array<[string, Tag[]]> = [];

  for (const [cat, items] of Object.entries(groups)) {
    if (TAG_CATEGORY_ORDER.includes(cat)) {
      known.push([cat, items]);
    } else {
      unknown.push([cat, items]);
    }
  }

  known.sort(
    (a, b) =>
      TAG_CATEGORY_ORDER.indexOf(a[0]) - TAG_CATEGORY_ORDER.indexOf(b[0]),
  );
  unknown.sort((a, b) => a[0].localeCompare(b[0]));
  return [...known, ...unknown];
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
  nutritionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cuisineCountryGap: {
    marginTop: spacing.xs,
  },
  nutritionInput: {
    flex: 1,
    gap: 4,
  },
  nutritionLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
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
    outlineStyle: "none" as never,
  },
});
