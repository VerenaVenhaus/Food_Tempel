// Rezepte in Form bringen, die geteilt + wieder importiert werden können.
//
// Wir teilen IMMER zwei Repräsentationen:
//   - Text: lesbar in WhatsApp, Mail, Notiz-Apps
//   - JSON: vollständige Daten zum Re-Import in Food_Tempel
//
// Die JSON-Datei hat einen "type"-Marker, damit der Empfänger weiß,
// dass es ein Food_Tempel-Rezept ist.

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";

import type { Nutrition } from "../db/schema";
import type { RecipeWithDetails } from "../db/repositories";

// "Wire format" für geteilte Rezepte. Versionsnummer, damit wir später
// kompatibel bleiben, wenn sich das Schema ändert.
export type RecipeShareEnvelope = {
  type: "food-tempel-recipe";
  version: 1;
  exportedAt: string;
  recipe: {
    title: string;
    description: string | null;
    instructions: string;
    prepTimeMinutes: number | null;
    cookTimeMinutes: number | null;
    servings: number | null;
    cuisine: string | null;
    mealType: string | null;
    sourceType: string;
    sourceUrl: string | null;
    ingredients: Array<{
      name: string;
      quantity: number | null;
      unit: string | null;
      notes: string | null;
    }>;
    tags: Array<{ name: string; category: string }>;
    nutrition: Omit<Nutrition, "recipeId" | "updatedAt"> | null;
  };
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Frühstück",
  lunch: "Mittag",
  dinner: "Abend",
  snack: "Snack",
  dessert: "Dessert",
};

/**
 * Macht eine lesbare Plaintext-Version eines Rezepts.
 */
function recipeToText(r: RecipeWithDetails): string {
  const lines: string[] = [];
  lines.push(`🍽️ ${r.title}`);
  if (r.description) lines.push(r.description);
  lines.push("");

  // Meta-Info
  const meta: string[] = [];
  if (r.prepTimeMinutes != null) meta.push(`Vorb. ${r.prepTimeMinutes} Min`);
  if (r.cookTimeMinutes != null) meta.push(`Kochen ${r.cookTimeMinutes} Min`);
  if (r.servings != null) meta.push(`${r.servings} Portionen`);
  if (r.mealType) meta.push(MEAL_LABELS[r.mealType] ?? r.mealType);
  if (meta.length > 0) lines.push(meta.join(" · "));

  // Zutaten
  if (r.ingredients.length > 0) {
    lines.push("");
    lines.push("Zutaten:");
    for (const i of r.ingredients) {
      const qty = i.quantity != null ? String(i.quantity) : "";
      const unit = i.unit ?? "";
      const notes = i.notes ? `, ${i.notes}` : "";
      lines.push(`• ${qty} ${unit} ${i.name}${notes}`.replace(/\s+/g, " ").trim());
    }
  }

  // Anleitung
  lines.push("");
  lines.push("Zubereitung:");
  lines.push(r.instructions);

  lines.push("");
  lines.push("— Erstellt mit Food_Tempel");
  return lines.join("\n");
}

/**
 * Macht die JSON-Hülle zum exakten Re-Import.
 */
function recipeToEnvelope(r: RecipeWithDetails): RecipeShareEnvelope {
  return {
    type: "food-tempel-recipe",
    version: 1,
    exportedAt: new Date().toISOString(),
    recipe: {
      title: r.title,
      description: r.description,
      instructions: r.instructions,
      prepTimeMinutes: r.prepTimeMinutes,
      cookTimeMinutes: r.cookTimeMinutes,
      servings: r.servings,
      cuisine: r.cuisine,
      mealType: r.mealType,
      sourceType: r.sourceType,
      sourceUrl: r.sourceUrl,
      ingredients: r.ingredients.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        notes: i.notes,
      })),
      tags: r.tags.map((t) => ({ name: t.name, category: t.category })),
      nutrition: r.nutrition
        ? {
            calories: r.nutrition.calories,
            proteinG: r.nutrition.proteinG,
            carbsG: r.nutrition.carbsG,
            fatG: r.nutrition.fatG,
            fiberG: r.nutrition.fiberG,
            sugarG: r.nutrition.sugarG,
            source: r.nutrition.source,
          }
        : null,
    },
  };
}

/**
 * Öffnet das native Share-Sheet mit Text + JSON-Datei.
 *
 * Reihenfolge: Erst Text in die Zwischenablage / share-Text, dann eine
 * separate JSON-Datei. Manche Apps (WhatsApp) nehmen nur eines auf einmal —
 * deshalb zwei Aufrufe.
 */
export async function shareRecipe(recipe: RecipeWithDetails): Promise<void> {
  const text = recipeToText(recipe);
  const envelope = recipeToEnvelope(recipe);

  // 1. JSON-Datei in den Cache schreiben
  const safeTitle = recipe.title
    .replace(/[^a-zA-Z0-9_\- ]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40);
  const filename = `${safeTitle || "rezept"}.json`;
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(envelope, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // 2. Native Share-Sheet öffnen mit der Datei
  // expo-sharing kann eine Datei an andere Apps weiterreichen.
  const sharingAvailable = await Sharing.isAvailableAsync();
  if (sharingAvailable) {
    await Sharing.shareAsync(path, {
      mimeType: "application/json",
      dialogTitle: `${recipe.title} teilen`,
      UTI: "public.json",
    });
    return;
  }

  // Fallback: nur den Text via React Native Share
  await Share.share({ message: text, title: recipe.title });
}

/**
 * Macht aus einer JSON-Datei wieder ein Rezept-Envelope.
 * Wirft, wenn das Format nicht stimmt.
 */
export function parseShareEnvelope(json: string): RecipeShareEnvelope {
  const parsed = JSON.parse(json);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    parsed.type !== "food-tempel-recipe"
  ) {
    throw new Error(
      "Die Datei sieht nicht wie ein Food_Tempel-Rezept aus.",
    );
  }
  if (parsed.version !== 1) {
    throw new Error(
      `Unbekannte Version: ${parsed.version}. App aktualisieren?`,
    );
  }
  return parsed as RecipeShareEnvelope;
}
