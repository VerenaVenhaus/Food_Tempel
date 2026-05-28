// Geteilte TypeScript-Typen zwischen Frontend (app/) und Backend (backend/).
// Der Inhalt sollte stabil sein — bei Änderungen müssen beide Seiten neu
// kompiliert werden.

// Was die KI-Extraktion zurückgibt — Felder spiegeln das Recipe-Schema wider,
// aber alle optional (die KI weiß evtl. nicht alles).
export type ExtractedRecipe = {
  title?: string;
  description?: string;
  // 1-Zeilen-Vorschau, von der KI mitgegeben (entweder aus Quelle übernommen
  // oder aus description abgeleitet).
  shortDescription?: string;
  instructions?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  cuisine?: string;
  // Kommagetrennte Liste. Welche Werte gültig sind, hängt davon ab, ob das
  // Rezept ein Food oder Drink ist — der User wählt das vorab; die App sagt
  // der KI bei der Extraktion Bescheid, damit sie die richtige Liste nutzt.
  mealType?: string;
  // Tag-Namen aus den geseedeten Kategorien (vegan, glutenfrei, scharf, …).
  // Die App matched sie case-insensitiv auf die DB-Tag-IDs.
  tags?: string[];
  imageUri?: string;
  sourceUrl?: string;
  ingredients?: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
  }>;
  // Konfidenz der Extraktion (0..1) — wir können später dem User zeigen,
  // wie sicher die KI war.
  confidence?: number;
};

// Standard-Response-Wrapper. Bei Erfolg kommt `data` (typisiert), bei
// Fehler `error`. So weiß der Client immer, was er bekommt.
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
