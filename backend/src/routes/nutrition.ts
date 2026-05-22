// /nutrition/* — Berechnung von Nährwerten via Open Food Facts.

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import {
  convertToGrams,
  searchProductNutriments,
} from "../lib/openFoodFacts.js";
import { requireAuth } from "../middleware/auth.js";

const calculateSchema = z.object({
  servings: z.number().int().positive().default(1),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().nonnegative().nullable().optional(),
        unit: z.string().nullable().optional(),
      }),
    )
    .min(1),
});

// Was wir der App zurückgeben — pro Portion.
export type NutritionResult = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  // Welche Zutaten konnten in OFF nicht gefunden werden — der User sieht
  // dann, dass die Werte unvollständig sind.
  missingIngredients: string[];
};

export async function nutritionRoutes(server: FastifyInstance): Promise<void> {
  server.addHook("preHandler", requireAuth);

  server.post<{ Body: unknown }>(
    "/nutrition/calculate",
    async (request, reply) => {
      const parsed = calculateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ ok: false, error: parsed.error.message });
      }

      const { servings, ingredients } = parsed.data;

      let totalKcal = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let totalFiber = 0;
      let totalSugar = 0;
      const missing: string[] = [];

      // Sequentiell, um die OFF-API nicht zu überrennen.
      // Bei sehr vielen Zutaten könnte man hier Promise.all mit Throttling nehmen.
      for (const ing of ingredients) {
        const nutriments = await searchProductNutriments(ing.name);
        if (!nutriments) {
          missing.push(ing.name);
          continue;
        }
        const grams = convertToGrams(ing.quantity ?? 0, ing.unit ?? null);
        if (grams <= 0) continue;
        const factor = grams / 100; // Werte sind pro 100g

        totalKcal += nutriments.caloriesPer100g * factor;
        totalProtein += nutriments.proteinPer100g * factor;
        totalCarbs += nutriments.carbsPer100g * factor;
        totalFat += nutriments.fatPer100g * factor;
        totalFiber += nutriments.fiberPer100g * factor;
        totalSugar += nutriments.sugarPer100g * factor;
      }

      // Auf Portionen verteilen + auf 1 Nachkommastelle runden
      const round = (n: number) => Math.round(n * 10) / 10;
      const result: NutritionResult = {
        calories: round(totalKcal / servings),
        proteinG: round(totalProtein / servings),
        carbsG: round(totalCarbs / servings),
        fatG: round(totalFat / servings),
        fiberG: round(totalFiber / servings),
        sugarG: round(totalSugar / servings),
        missingIngredients: missing,
      };

      return { ok: true, data: result };
    },
  );
}
