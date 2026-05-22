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
import { SelectChips } from "../components/SelectChips";
import type { ExtractedRecipe } from "../lib/api";
import {
  createRecipe,
  getRecipeById,
  listTags,
  updateRecipeWithDetails,
  type CreateRecipeInput,
} from "../db/repositories";
import type { Tag } from "../db/schema";
import type { RootStackParamList } from "../navigation/types";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeForm">;

// Optionen für die Auswahl-Chips
type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "dessert";

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Frühstück" },
  { value: "lunch", label: "Mittag" },
  { value: "dinner", label: "Abend" },
  { value: "snack", label: "Snack" },
  { value: "dessert", label: "Dessert" },
];

const TAG_CATEGORY_LABELS: Record<string, string> = {
  diet: "Ernährungsform",
  health: "Gesundheit",
  allergen: "Allergene",
  occasion: "Anlass",
};

// Häufige Küchen — kann später erweitert oder zur Eingabe geöffnet werden.
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

export function RecipeFormScreen({ navigation, route }: Props) {
  const editId = route.params?.editId;
  const isEdit = !!editId;

  // Form-State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  // Tags gruppiert nach Kategorie — bekommen wir aus listTags() und packen
  // sie hier in ein Map-artiges Objekt für die Render-Schleife unten.
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, Tag[]>>({});

  // UI-State
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [instructionsError, setInstructionsError] = useState<string | undefined>();

  // Header-Titel + Speichern-Button setzen
  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? "Rezept bearbeiten" : "Neues Rezept",
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
  }, [navigation, isEdit, saving, title, instructions, ingredients, selectedTagIds, imageUri, mealType, cuisine, prepTime, cookTime, servings, description]);

  // Alle Tags zur Auswahl laden — direkt nach Kategorie gruppiert
  useEffect(() => {
    (async () => {
      const tags = await listTags();
      const grouped: Record<string, Tag[]> = {};
      for (const t of tags) {
        (grouped[t.category] ||= []).push(t);
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
      setTitle(data.title);
      setDescription(data.description ?? "");
      setInstructions(data.instructions);
      setPrepTime(data.prepTimeMinutes?.toString() ?? "");
      setCookTime(data.cookTimeMinutes?.toString() ?? "");
      setServings(data.servings?.toString() ?? "");
      setMealType((data.mealType as MealType) ?? null);
      setCuisine(data.cuisine ?? null);
      setImageUri(data.imageUri ?? null);
      setIngredients(
        data.ingredients.map((i) => ({
          name: i.name,
          quantity: i.quantity != null ? String(i.quantity) : "",
          unit: i.unit ?? "",
          notes: i.notes ?? "",
        })),
      );
      setSelectedTagIds(data.tags.map((t) => t.id));
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
      instructions: instructions.trim(),
      prepTimeMinutes: parseIntOrNull(prepTime),
      cookTimeMinutes: parseIntOrNull(cookTime),
      servings: parseIntOrNull(servings),
      imageUri: imageUri ?? undefined,
      sourceType: "manual",
      cuisine: cuisine ?? undefined,
      mealType: mealType ?? undefined,
      ingredients: ingredients
        .filter((i) => i.name.trim().length > 0)
        .map((i) => ({
          name: i.name.trim(),
          quantity: parseFloatOrNull(i.quantity),
          unit: i.unit.trim() || undefined,
          notes: i.notes.trim() || undefined,
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
    if (r.instructions) setInstructions(r.instructions);
    if (r.prepTimeMinutes != null) setPrepTime(String(r.prepTimeMinutes));
    if (r.cookTimeMinutes != null) setCookTime(String(r.cookTimeMinutes));
    if (r.servings != null) setServings(String(r.servings));
    if (r.mealType) setMealType(r.mealType);
    if (r.cuisine) setCuisine(r.cuisine);
    if (r.imageUri) setImageUri(r.imageUri);
    if (r.ingredients && r.ingredients.length > 0) {
      setIngredients(
        r.ingredients.map((i) => ({
          name: i.name,
          quantity: i.quantity != null ? String(i.quantity) : "",
          unit: i.unit ?? "",
          notes: i.notes ?? "",
        })),
      );
    }
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    try {
      const input = buildInput();
      if (editId) {
        await updateRecipeWithDetails(editId, input);
      } else {
        await createRecipe(input);
      }
      // Zurück zur vorigen Seite (Hauptseite oder Detail)
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
        {!isEdit && <ImportSection onImport={applyExtracted} />}

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
          value={description}
          onChangeText={setDescription}
          placeholder="Worum geht's? (optional)"
        />

        {/* Zeit-Felder in einer Reihe */}
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
          <View style={styles.rowItem}>
            <FormField
              label="Portionen"
              value={servings}
              onChangeText={setServings}
              keyboardType="numeric"
              placeholder="2"
            />
          </View>
        </View>

        <IngredientList value={ingredients} onChange={setIngredients} />

        <FormField
          label="Anleitung"
          value={instructions}
          onChangeText={setInstructions}
          placeholder={"1. Schritt eins…\n2. Schritt zwei…"}
          multiline
          required
          error={instructionsError}
        />

        {/* Block aller Klassifizierungs-Sektionen — am Ende des Formulars,
            damit der User erst die "Pflicht"-Daten (Titel, Anleitung, Zutaten)
            ausfüllt und dann optional verfeinert. */}
        <Text style={styles.categoriesHeader}>Kategorien</Text>

        <CollapsibleSection
          title="Mahlzeit"
          badge={mealType ? 1 : 0}
          defaultOpen={!!mealType}
        >
          <SelectChips
            options={MEAL_OPTIONS}
            value={mealType}
            onChange={setMealType}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Küche / Land"
          badge={cuisine ? 1 : 0}
          defaultOpen={!!cuisine}
        >
          <SelectChips
            options={CUISINE_OPTIONS}
            value={cuisine}
            onChange={setCuisine}
          />
        </CollapsibleSection>

        {/* Eine eigene Sektion pro Tag-Kategorie. Badge = wie viele Tags
            aus dieser Kategorie schon ausgewählt sind. */}
        {Object.entries(tagsByCategory).map(([category, items]) => {
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
});
