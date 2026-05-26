// Rezepte teilbar machen.
//
// Wir verschicken den Rezept-Inhalt als reinen Text — lesbar in WhatsApp,
// Mail, Signal, SMS usw. Am Ende des Textes hängen wir einen Deep-Link
// `foodtempel://import?data=...` an, der die gesamten Rezeptdaten kodiert
// trägt.
//
// Empfänger MIT Food_Tempel: tippt den Link → App öffnet sich → Rezept
// kann mit einem Tap importiert werden.
// Empfänger OHNE Food_Tempel: ignoriert den Link, liest den Text wie eine
// normale Nachricht.

import { Share } from "react-native";

import { formatCuisines } from "../data/cuisines";
import { DRINK_LABEL_BY_VALUE } from "../data/drinkTypes";
import { formatMealTypes } from "../data/mealTypes";
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
    // Optional, damit ältere Geräte (ohne kind-Feld) noch lesbar bleiben.
    // Beim Import wird "food" als Default eingesetzt.
    kind?: "food" | "drink";
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

/**
 * Macht eine lesbare Plaintext-Version eines Rezepts (ohne Footer/Link —
 * die werden in shareRecipe drangehängt).
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
  if (r.mealType) meta.push(formatMealTypes(r.mealType, DRINK_LABEL_BY_VALUE));
  if (r.cuisine) meta.push(formatCuisines(r.cuisine));
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

  return lines.join("\n");
}

/**
 * Baut einen Deep-Link mit den Rezept-Daten URL-encoded im Query-Parameter.
 * `foodtempel://import?data=%7B%22type%22%3A%22food-tempel-recipe%22%2C…
 *
 * Wir bewusst KEIN Base64 — encodeURIComponent ist UTF-8-sicher (Umlaute!)
 * und reicht für Schemata, die nur URL-safe Chars wollen. Die URL wird
 * dadurch länger, aber WhatsApp, Mail & Co. handhaben das problemlos.
 */
export function buildShareLink(r: RecipeWithDetails): string {
  const envelope = recipeToEnvelope(r);
  const data = encodeURIComponent(JSON.stringify(envelope));
  return `foodtempel://import?data=${data}`;
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
      kind: r.kind,
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
 * Öffnet das native Share-Sheet mit dem Rezepttext + dem Deep-Link.
 * Der Empfänger sieht eine ganz normale Nachricht; wenn er Food_Tempel
 * installiert hat, kann er den Link tippen und das Rezept landet direkt
 * in seiner App.
 */
export async function shareRecipe(recipe: RecipeWithDetails): Promise<void> {
  const text = recipeToText(recipe);
  const link = buildShareLink(recipe);

  const message =
    `${text}\n\n` +
    `📥 In Food_Tempel öffnen:\n${link}\n\n` +
    `— Erstellt mit Food_Tempel`;

  await Share.share({ message, title: recipe.title });
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
