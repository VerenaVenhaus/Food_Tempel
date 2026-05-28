// Formular zum Anlegen ODER Bearbeiten eines Rezepts.
// Beim Routing-Parameter `editId` lädt es die Daten vor und ruft beim Speichern
// updateRecipeWithDetails auf — sonst createRecipe.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CollapsibleSection } from "../components/CollapsibleSection";
import { FormField } from "../components/FormField";
import { ImagePickerField } from "../components/ImagePickerField";
import { ImportSection } from "../components/ImportSection";
import { IngredientList, type IngredientDraft } from "../components/IngredientList";
import { InstructionList } from "../components/InstructionList";
import { MultiSelectDropdown } from "../components/MultiSelectDropdown";
import {
  EMPTY_NUTRITION,
  NutritionSection,
  type NutritionDraft,
} from "../components/NutritionSection";
import { SelectChips } from "../components/SelectChips";
import {
  CONTINENT_OPTIONS,
  CONTINENT_VALUES,
  COUNTRIES,
  getContinentsForCountries,
  joinCuisineArray,
  parseCuisineString,
} from "../data/cuisines";
import { DRINK_TYPE_OPTIONS } from "../data/drinkTypes";
import {
  joinMealTypeArray,
  MEAL_TYPE_OPTIONS,
  parseMealTypeString,
} from "../data/mealTypes";
import type { ExtractedRecipe } from "../lib/api";
import {
  createRecipe,
  deleteNutrition,
  getNutrition,
  getRecipeById,
  listTags,
  reconcileBlsCode,
  saveNutrition,
  updateRecipeWithDetails,
  type CreateRecipeInput,
} from "../db/repositories";
import type { Tag } from "../db/schema";
import type { RootStackParamList } from "../navigation/types";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeForm">;

const TAG_CATEGORY_LABELS: Record<string, string> = {
  diet: "Ernährungsform",
  health: "Gesundheit",
  allergen: "Allergene",
  taste: "Geschmacksrichtung",
  alcohol: "Alkohol",
  occasion: "Anlass",
};

export function RecipeFormScreen({ navigation, route }: Props) {
  const editId = route.params?.editId;
  const isEdit = !!editId;
  // Beim Anlegen: Modus aus Route-Param. Beim Bearbeiten: wird unten aus
  // den geladenen DB-Daten überschrieben.
  const [kind, setKind] = useState<"food" | "drink">(
    route.params?.kind ?? "food",
  );
  const isDrink = kind === "drink";

  // Form-State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Kurzbeschreibung — 1-2 Zeilen, erscheint in der Rezept-Karte auf der
  // Hauptseite unter dem Titel. Bewusst getrennt von der ausführlichen
  // Beschreibung, damit die Karte aufgeräumt bleibt.
  const [shortDescription, setShortDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  // Default: 1 Portion — die häufigste Annahme bei neuen Rezepten und
  // verhindert eine leere Anzeige. Beim Bearbeiten überschreibt der DB-Wert.
  const [servings, setServings] = useState("1");
  // Mahlzeiten + Küchen sind jetzt Mehrfachauswahl. In der DB landen sie
  // als komma-separierte Strings; im Form arbeiten wir mit Arrays.
  const [mealTypes, setMealTypes] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  // Kontinente sind nur ein UI-Helper, der die Länder-Auswahl scopt — wir
  // speichern sie nicht in der DB, sondern leiten sie beim Laden aus den
  // Ländern ab.
  const [continents, setContinents] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  // Tags gruppiert nach Kategorie — bekommen wir aus listTags() und packen
  // sie hier in ein Map-artiges Objekt für die Render-Schleife unten.
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, Tag[]>>({});
  const [nutritionDraft, setNutritionDraft] =
    useState<NutritionDraft>(EMPTY_NUTRITION);
  // Beim Bearbeiten: für wie viele Portionen waren die gespeicherten
  // Nährwerte berechnet? Wird einmalig nach dem DB-Load gesetzt; ermöglicht
  // der NutritionSection das automatische Umrechnen, wenn die User die
  // Portionen nachträglich ändert.
  const [nutritionInitialServings, setNutritionInitialServings] = useState<
    number | null
  >(null);

  // UI-State
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [instructionsError, setInstructionsError] = useState<string | undefined>();

  // Header-Titel + Speichern-Button setzen
  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit
        ? isDrink
          ? "Getränk bearbeiten"
          : "Rezept bearbeiten"
        : isDrink
          ? "Neues Getränk"
          : "Neues Rezept",
      headerRight: () => (
        <Pressable
          onPress={save}
          disabled={saving}
          hitSlop={12}
          accessibilityLabel="Rezept speichern"
        >
          <Text style={[styles.headerSaveButton, saving && styles.headerSaveButtonDisabled]}>
            {saving ? "…" : "Speichern"}
          </Text>
        </Pressable>
      ),
    });
    // Wir nehmen save bewusst NICHT in die Deps, sonst flickert der Header.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, isEdit, isDrink, saving, title, instructions, ingredients, selectedTagIds, imageUri, mealTypes, cuisines, prepTime, cookTime, servings, description, shortDescription]);

  // Alle Tags zur Auswahl laden — direkt nach Kategorie gruppiert
  useEffect(() => {
    (async () => {
      const tags = await listTags();
      const grouped: Record<string, Tag[]> = {};
      for (const t of tags) {
        (grouped[t.category] ||= []).push(t);
      }
      // Innerhalb jeder Kategorie alphabetisch (deutsche Sortierung).
      for (const cat of Object.keys(grouped)) {
        grouped[cat].sort((a, b) =>
          a.name.localeCompare(b.name, "de", { sensitivity: "base" }),
        );
      }
      setTagsByCategory(grouped);
    })();
  }, []);

  // Bei Bearbeiten: bestehende Daten vorbefüllen
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const data = await getRecipeById(editId);
      if (!data) return;
      setKind(data.kind);
      setTitle(data.title);
      setDescription(data.description ?? "");
      setShortDescription(data.shortDescription ?? "");
      setInstructions(data.instructions);
      setPrepTime(data.prepTimeMinutes?.toString() ?? "");
      setCookTime(data.cookTimeMinutes?.toString() ?? "");
      setServings(data.servings?.toString() ?? "");
      // Aus den komma-separierten DB-Strings zu Arrays.
      const loadedMealTypes = parseMealTypeString(data.mealType);
      setMealTypes(loadedMealTypes);
      // cuisine-Spalte kann Länder UND Kontinent-Werte gemischt enthalten
      // (wenn der User nur einen Kontinent ohne Land gewählt hat). Wir
      // trennen die beiden hier wieder auf.
      const parsed = parseCuisineString(data.cuisine);
      const loadedCuisines = parsed.filter((v) => !CONTINENT_VALUES.has(v));
      const storedContinents = parsed.filter((v) => CONTINENT_VALUES.has(v));
      setCuisines(loadedCuisines);
      // Kontinente: gespeicherte + aus den Ländern abgeleitete, dedupliziert.
      setContinents(
        Array.from(
          new Set([
            ...storedContinents,
            ...getContinentsForCountries(loadedCuisines),
          ]),
        ),
      );
      setImageUri(data.imageUri ?? null);
      setIngredients(
        data.ingredients.map((i) => ({
          name: i.name,
          quantity: i.quantity != null ? String(i.quantity) : "",
          unit: i.unit ?? "",
          notes: i.notes ?? "",
          blsCode: i.blsCode ?? null,
        })),
      );
      setSelectedTagIds(data.tags.map((t) => t.id));
      // Nährwerte vorbefüllen, falls vorhanden
      if (data.nutrition) {
        setNutritionDraft({
          calories: data.nutrition.calories != null ? String(data.nutrition.calories) : "",
          proteinG: data.nutrition.proteinG != null ? String(data.nutrition.proteinG) : "",
          carbsG: data.nutrition.carbsG != null ? String(data.nutrition.carbsG) : "",
          fatG: data.nutrition.fatG != null ? String(data.nutrition.fatG) : "",
          fiberG: data.nutrition.fiberG != null ? String(data.nutrition.fiberG) : "",
          sugarG: data.nutrition.sugarG != null ? String(data.nutrition.sugarG) : "",
        });
        // Wenn das Rezept eine Portionsanzahl hat, merken wir sie als
        // "diese Werte gelten für N Portionen". Auto-Skalierung in der
        // NutritionSection greift dann beim Ändern der Portionen.
        if (data.servings != null && data.servings > 0) {
          setNutritionInitialServings(data.servings);
        }
      }
    })();
  }, [editId]);

  function validate(): boolean {
    let ok = true;
    if (!title.trim()) {
      setTitleError("Titel ist erforderlich");
      ok = false;
    } else {
      setTitleError(undefined);
    }
    if (!instructions.trim()) {
      setInstructionsError("Anleitung ist erforderlich");
      ok = false;
    } else {
      setInstructionsError(undefined);
    }
    return ok;
  }

  function buildInput(): CreateRecipeInput {
    return {
      title: title.trim(),
      description: description.trim() || undefined,
      shortDescription: shortDescription.trim() || undefined,
      instructions: instructions.trim(),
      prepTimeMinutes: parseIntOrNull(prepTime),
      cookTimeMinutes: parseIntOrNull(cookTime),
      servings: parseIntOrNull(servings),
      imageUri: imageUri ?? undefined,
      sourceType: "manual",
      // Multi-Werte werden zu komma-separierten Strings serialisiert.
      // Länder UND Kontinente landen in derselben Spalte (cuisine) — beim
      // Laden werden sie wieder per CONTINENT_VALUES-Set getrennt. So bleibt
      // eine reine Kontinent-Auswahl (z.B. "Europa" ohne Land) erhalten.
      cuisine:
        joinCuisineArray([
          ...continents,
          ...cuisines,
        ]) ?? undefined,
      mealType: joinMealTypeArray(mealTypes) ?? undefined,
      kind,
      ingredients: ingredients
        .filter((i) => i.name.trim().length > 0)
        .map((i) => ({
          name: i.name.trim(),
          quantity: parseFloatOrNull(i.quantity),
          unit: i.unit.trim() || undefined,
          notes: i.notes.trim() || undefined,
          blsCode: i.blsCode ?? null,
        })),
      tagIds: selectedTagIds,
    };
  }

  // Vorbefüllen aus KI-Extraktion (Foto / URL / PDF).
  // Wir überschreiben nur Felder, die wirklich befüllt sind — leere KI-Antworten
  // killen also bestehende Eingaben nicht.
  function applyExtracted(r: ExtractedRecipe) {
    if (r.title) setTitle(r.title);
    if (r.description) setDescription(r.description);
    if (r.shortDescription) setShortDescription(r.shortDescription);
    if (r.instructions) setInstructions(r.instructions);
    if (r.prepTimeMinutes != null) setPrepTime(String(r.prepTimeMinutes));
    if (r.cookTimeMinutes != null) setCookTime(String(r.cookTimeMinutes));
    if (r.servings != null) setServings(String(r.servings));
    // kind wird BEWUSST nicht von der KI übernommen — der User hat das vorab
    // im Chooser festgelegt und das soll Vorrang haben.
    // mealType kommt kommagetrennt zurück (Mehrfach-Auswahl möglich).
    if (r.mealType) {
      setMealTypes(
        r.mealType
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      );
    }
    if (r.cuisine && r.cuisine.trim().toLowerCase() !== "other") {
      // KI gibt manchmal "other" zurück, wenn sie sich unsicher ist — wir
      // ignorieren das hier, sonst landet "other" als unlesbares Tag in der
      // Detail-Ansicht. Lieber kein Eintrag als ein nichtssagender.
      setCuisines([r.cuisine]);
      setContinents(getContinentsForCountries([r.cuisine]));
    }
    if (r.imageUri) setImageUri(r.imageUri);
    // Tag-Namen aus der KI → DB-Tag-IDs. Case-insensitiv matchen, unbekannte
    // Namen still verwerfen (z.B. wenn die KI mal frei erfindet trotz Liste).
    if (r.tags && r.tags.length > 0) {
      const allTags = Object.values(tagsByCategory).flat();
      const ids = r.tags
        .map((aiName) => aiName.trim().toLowerCase())
        .map((q) => allTags.find((t) => t.name.toLowerCase() === q)?.id)
        .filter((id): id is string => Boolean(id));
      if (ids.length > 0) {
        // Mit ggf. bestehenden Tags zusammenführen (Set entdoppelt).
        setSelectedTagIds((existing) =>
          Array.from(new Set([...existing, ...ids])),
        );
      }
    }
    if (r.ingredients && r.ingredients.length > 0) {
      setIngredients(
        r.ingredients.map((i) => {
          // KI-Reconcile: Wenn der Name sicher einem BLS-Eintrag entspricht,
          // übernehmen wir Name + Code aus dem BLS — so kann Phase 4 hinterher
          // exakte Nährwerte rechnen. Bleibt der Treffer unsicher, behalten
          // wir den Roh-Namen der KI (blsCode = null), Nährwerte gehen dann
          // später per Backend/OFF-Fallback.
          const bls = reconcileBlsCode(i.name);
          return {
            name: bls ? bls.name : i.name,
            quantity: i.quantity != null ? String(i.quantity) : "",
            unit: i.unit ?? "",
            notes: i.notes ?? "",
            blsCode: bls ? bls.code : null,
          };
        }),
      );
    }
  }

  // Wandelt den Nutrition-String-Draft in das DB-Format um.
  // Ein leerer String wird zu null — heißt "nicht erfasst".
  function buildNutrition() {
    const parse = (s: string): number | null => {
      const t = s.trim().replace(",", ".");
      if (!t) return null;
      const n = parseFloat(t);
      return Number.isFinite(n) ? n : null;
    };
    return {
      calories: parse(nutritionDraft.calories),
      proteinG: parse(nutritionDraft.proteinG),
      carbsG: parse(nutritionDraft.carbsG),
      fatG: parse(nutritionDraft.fatG),
      fiberG: parse(nutritionDraft.fiberG),
      sugarG: parse(nutritionDraft.sugarG),
    };
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    try {
      const input = buildInput();
      let recipeId: string;
      if (editId) {
        await updateRecipeWithDetails(editId, input);
        recipeId = editId;
      } else {
        recipeId = await createRecipe(input);
      }

      // Nährwerte: speichern wenn mindestens ein Wert eingetragen wurde,
      // sonst Zeile löschen (falls vorhanden).
      const nutritionValues = buildNutrition();
      const hasAnyNutrition = Object.values(nutritionValues).some((v) => v != null);
      if (hasAnyNutrition) {
        await saveNutrition(recipeId, { ...nutritionValues, source: "manual" });
      } else if (editId) {
        // Beim Bearbeiten: wenn alle Werte gelöscht wurden, auch DB-Zeile weg.
        const existing = await getNutrition(editId);
        if (existing) await deleteNutrition(editId);
      }

      navigation.goBack();
    } catch (err) {
      Alert.alert("Fehler", err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* KI-Import nur beim Neu-Anlegen anbieten — beim Bearbeiten
            wäre es verwirrend, weil Felder schon befüllt sind. */}
        {!isEdit && <ImportSection onImport={applyExtracted} kind={kind} />}

        <ImagePickerField value={imageUri} onChange={setImageUri} />

        <FormField
          label="Titel"
          value={title}
          onChangeText={setTitle}
          placeholder="z.B. Spaghetti Bolognese"
          required
          error={titleError}
        />

        <FormField
          label="Kurzbeschreibung"
          value={shortDescription}
          onChangeText={setShortDescription}
          placeholder="1-2 Zeilen, erscheint in der Rezept-Karte"
        />

        <FormField
          label="Ausführliche Beschreibung"
          value={description}
          onChangeText={setDescription}
          placeholder="Hintergrund, Tipps, Geschichte … (optional)"
          multiline
        />

        {/* Zeit-Felder in einer Reihe — nur zwei Felder, damit das längere
            "Vorbereitung (Min)"-Label bei halber Breite einzeilig bleibt. */}
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <FormField
              label="Vorbereitung (Min)"
              value={prepTime}
              onChangeText={setPrepTime}
              keyboardType="numeric"
              placeholder="10"
            />
          </View>
          <View style={styles.rowItem}>
            <FormField
              label="Kochen (Min)"
              value={cookTime}
              onChangeText={setCookTime}
              keyboardType="numeric"
              placeholder="20"
            />
          </View>
        </View>

        {/* Portionen in eigener Reihe darunter — eine Spalte (halbe Breite,
            bündig unter "Vorbereitung"), rechte Spalte bleibt als Platzhalter leer. */}
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <FormField
              label="Portionen"
              value={servings}
              onChangeText={setServings}
              keyboardType="numeric"
              placeholder="2"
            />
          </View>
          <View style={styles.rowItem} />
        </View>

        <IngredientList value={ingredients} onChange={setIngredients} />

        <InstructionList
          value={instructions}
          onChange={setInstructions}
          required
          error={instructionsError}
        />

        {/* Block aller Klassifizierungs-Sektionen — am Ende des Formulars,
            damit der User erst die "Pflicht"-Daten (Titel, Anleitung, Zutaten)
            ausfüllt und dann optional verfeinert. */}
        <Text style={styles.categoriesHeader}>Kategorien</Text>

        <CollapsibleSection
          title={isDrink ? "Getränketyp" : "Mahlzeit"}
          badge={mealTypes.length}
          defaultOpen={mealTypes.length > 0}
        >
          <SelectChips
            options={isDrink ? DRINK_TYPE_OPTIONS : MEAL_TYPE_OPTIONS}
            value={mealTypes}
            onChange={setMealTypes}
            multiSelect
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Küche / Land"
          badge={cuisines.length}
          defaultOpen={cuisines.length > 0 || continents.length > 0}
        >
          <Text style={styles.cuisineHint}>
            Beim Auswählen eines Lands wird der passende Kontinent automatisch
            dazu getaggt. Beide Listen sind unabhängig — Länder werden nie vom
            Kontinent eingeschränkt.
          </Text>
          <MultiSelectDropdown
            options={CONTINENT_OPTIONS}
            value={continents}
            onChange={setContinents}
            placeholder="Kontinent auswählen…"
            modalTitle="Kontinent"
            searchPlaceholder="Kontinent suchen…"
          />
          <View style={styles.cuisineCountryGap}>
            <MultiSelectDropdown
              options={COUNTRIES.map((c) => ({
                value: c.value,
                label: c.label,
              })).sort((a, b) =>
                a.label.localeCompare(b.label, "de", { sensitivity: "base" }),
              )}
              value={cuisines}
              onChange={(next) => {
                setCuisines(next);
                // Kontinente der gewählten Länder additiv mergen — nie
                // vorhandene Kontinente entfernen.
                const derived = getContinentsForCountries(next);
                setContinents((prev) =>
                  Array.from(new Set([...prev, ...derived])),
                );
              }}
              placeholder="Land auswählen…"
              modalTitle="Land"
              searchPlaceholder="Land suchen…"
            />
          </View>
        </CollapsibleSection>

        {/* Eine eigene Sektion pro Tag-Kategorie. Badge = wie viele Tags
            aus dieser Kategorie schon ausgewählt sind.
            "alcohol" wird nur im Drink-Modus angezeigt — bei einem Essen-
            Rezept würde das nicht passen. */}
        {Object.entries(tagsByCategory)
          .filter(([category]) => (category === "alcohol" ? isDrink : true))
          .map(([category, items]) => {
          const idsInCat = items.map((t) => t.id);
          const selectedInCat = selectedTagIds.filter((id) =>
            idsInCat.includes(id),
          );
          return (
            <CollapsibleSection
              key={category}
              title={TAG_CATEGORY_LABELS[category] ?? category}
              badge={selectedInCat.length}
              defaultOpen={selectedInCat.length > 0}
            >
              <SelectChips
                options={items.map((t) => ({ value: t.id, label: t.name }))}
                value={selectedTagIds}
                onChange={setSelectedTagIds}
                multiSelect
              />
            </CollapsibleSection>
          );
        })}

        {/* Nährwerte — ganz unten in den Kategorien, weil optional/aufwändiger */}
        {(() => {
          const filledCount = Object.values(nutritionDraft).filter(
            (v) => v.trim().length > 0,
          ).length;
          return (
            <CollapsibleSection
              title="Nährwerte (pro Portion)"
              badge={filledCount}
              defaultOpen={filledCount > 0}
            >
              <NutritionSection
                value={nutritionDraft}
                onChange={setNutritionDraft}
                ingredients={ingredients
                  .filter((i) => i.name.trim().length > 0)
                  .map((i) => ({
                    name: i.name.trim(),
                    quantity: parseFloatOrNull(i.quantity) ?? null,
                    unit: i.unit.trim() || null,
                    blsCode: i.blsCode ?? null,
                  }))}
                servings={parseIntOrNull(servings) ?? 1}
                initialComputedForServings={nutritionInitialServings}
              />
            </CollapsibleSection>
          );
        })()}

        {/* Großer Speichern-Button am Ende — manche User finden den Header-Button schwer */}
        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            (pressed || saving) && styles.saveButtonPressed,
          ]}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Speichere…" : isEdit ? "Änderungen speichern" : "Rezept anlegen"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Kleine Helfer: leere Strings → null, sonst geparste Zahl.
function parseIntOrNull(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : undefined;
}
function parseFloatOrNull(s: string): number | undefined {
  const t = s.trim().replace(",", ".");
  if (!t) return undefined;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : undefined;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rowItem: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  headerSaveButton: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    paddingHorizontal: spacing.sm,
  },
  headerSaveButtonDisabled: {
    opacity: 0.5,
  },
  categoriesHeader: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: -spacing.xs, // optisch näher an die erste Sektion
  },
  cuisineHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  cuisineCountryGap: {
    marginTop: spacing.xs,
  },
});
