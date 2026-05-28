// Allergen-Tags werden positiv markiert ("enthält-X"), aber im Filter
// negativ angeboten ("X-frei"). Dieser Helper liefert das Anzeige-Label für
// die jeweilige Inversion.
//
// Verwendung im FilterScreen: Allergen-Chips zeigen "glutenfrei" als Label,
// schreiben aber bei Auswahl die Tag-ID des "enthält-gluten"-Tags in
// filter.excludedTagIds. Die Recipes-Query schließt Rezepte mit dieser
// Tag-ID dann aus.

export const ALLERGEN_INVERSE_LABEL: Record<string, string> = {
  "enthält-gluten": "glutenfrei",
  "enthält-laktose": "laktosefrei",
  "enthält-nüsse": "nussfrei",
  "enthält-erdnüsse": "erdnussfrei",
  "enthält-eier": "eierfrei",
  "enthält-fisch": "fischfrei",
  "enthält-krustentiere": "krustentierfrei",
  "enthält-weichtiere": "weichtierfrei",
  "enthält-soja": "sojafrei",
  "enthält-sellerie": "selleriefrei",
  "enthält-senf": "senffrei",
  "enthält-sesam": "sesamfrei",
  "enthält-sulfite": "sulfitfrei",
  "enthält-lupinen": "lupinenfrei",
  "enthält-histamin": "histaminarm",
  "enthält-fructose": "fructosearm",
};

// Fallback: wenn ein Allergen-Tag-Name nicht in der Map steht (z.B. künftig
// neu hinzugefügt), generieren wir einen vernünftigen Default.
export function allergenInverseLabel(tagName: string): string {
  return (
    ALLERGEN_INVERSE_LABEL[tagName] ??
    tagName.replace(/^enthält[-\s]/i, "") + "-frei"
  );
}
