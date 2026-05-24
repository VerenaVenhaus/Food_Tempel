export type ExtractedRecipe = {
  title?: string;
  description?: string;
  instructions?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  cuisine?: string;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack" | "dessert";
  imageUri?: string;
  sourceUrl?: string;
  ingredients?: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
  }>;
  confidence?: number;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
