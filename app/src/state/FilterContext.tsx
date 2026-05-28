// Globaler State für den Rezept-Filter.
//
// Warum Context, nicht navigation params?
// - HomeScreen + FilterScreen brauchen denselben Filter-Wert
// - Mit navigation.navigate("...", { filter }) müsste man den Wert immer
//   serialisieren — und Callbacks (wie onApply) gehen damit gar nicht
// - React Context ist der einfachste Weg, einen Wert App-weit zu teilen
//
// `useFilter()` ist ein kleiner Hook für UI-Komponenten:
//   const { filter, setFilter, resetFilter, activeCount } = useFilter();

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type RecipeKind = "food" | "drink";

export type RecipeFilterState = {
  // Aktive Ansicht: Essen oder Getränke. Wird zur Filterung der Liste auf
  // HomeScreen genutzt UND steuert, welche Kategorien (Mahlzeit vs.
  // Getränketyp) im FilterScreen / Rezept-Formular angezeigt werden.
  kind: RecipeKind;
  search: string;
  // Im Food-Modus: Mahlzeit-Typen (breakfast,…). Im Drink-Modus:
  // Getränke-Typen (cocktail,…). Gleiches Array, je nach kind unterschiedliche
  // Wertebereiche.
  mealTypes: string[];
  continents: string[];
  cuisines: string[];
  tagIds: string[];
  // Tag-IDs, die ein Rezept NICHT haben darf — für die invertierte Allergen-
  // Logik: Filter zeigt "glutenfrei", schließt aber Rezepte mit "enthält-gluten"
  // aus. So muss der User beim Anlegen nur die echt enthaltenen Allergene
  // markieren statt alle "frei"-Varianten anklicken.
  excludedTagIds: string[];
  ingredientNames: string[];
  // Nährwerte-Filter (pro Portion). null = nicht gesetzt.
  maxCalories: number | null;
  minProtein: number | null;
};

const EMPTY_FILTER: RecipeFilterState = {
  kind: "food",
  search: "",
  mealTypes: [],
  continents: [],
  cuisines: [],
  tagIds: [],
  excludedTagIds: [],
  ingredientNames: [],
  maxCalories: null,
  minProtein: null,
};

type FilterContextValue = {
  filter: RecipeFilterState;
  setFilter: (next: RecipeFilterState) => void;
  resetFilter: () => void;
  // Wechselt die Ansicht (Essen ↔ Getränke). Setzt nebenbei `mealTypes`
  // zurück, weil das Wertebereich-abhängig ist (food-Werte ≠ drink-Werte).
  // Andere Filter (Suche, Cuisine, Tags, Nährwerte) bleiben — die sind
  // sinnvoll modus-übergreifend.
  setKind: (kind: RecipeKind) => void;
  activeCount: number;
  // refreshKey wird inkrementiert, wenn sich der Rezept-Bestand "von außen"
  // ändert (Cloud-Restore, Import) — damit die Hauptseite neu lädt, ohne
  // dass der User extra wischen muss.
  refreshKey: number;
  bumpRefresh: () => void;
};

const FilterContext = createContext<FilterContextValue>({
  filter: EMPTY_FILTER,
  setFilter: () => {},
  resetFilter: () => {},
  setKind: () => {},
  activeCount: 0,
  refreshKey: 0,
  bumpRefresh: () => {},
});

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<RecipeFilterState>(EMPTY_FILTER);
  const [refreshKey, setRefreshKey] = useState(0);

  const resetFilter = useCallback(
    () =>
      // kind beibehalten — der User soll im aktuellen Tab bleiben.
      setFilter((prev) => ({ ...EMPTY_FILTER, kind: prev.kind })),
    [],
  );
  const setKind = useCallback(
    (kind: RecipeKind) =>
      setFilter((prev) => ({ ...prev, kind, mealTypes: [] })),
    [],
  );
  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Wie viele Filter sind aktiv? Wird für das Badge auf dem Filter-Icon
  // genutzt. Volltext-Suche zählen wir hier NICHT mit, weil die ein
  // sichtbares Suchfeld hat.
  const activeCount = useMemo(() => {
    let n = 0;
    n += filter.mealTypes.length;
    // Continents zählen wir nicht extra mit — sie sind ein UI-Helper, der
    // den Länderfilter scopt. Sobald Länder gewählt sind, sind die schon
    // berücksichtigt; ohne Länder zählen wir die continents als 1
    // "Küchen-Filter".
    if (filter.cuisines.length === 0 && filter.continents.length > 0) n++;
    n += filter.cuisines.length;
    n += filter.tagIds.length;
    n += filter.excludedTagIds.length;
    n += filter.ingredientNames.length;
    if (filter.maxCalories != null) n++;
    if (filter.minProtein != null) n++;
    return n;
  }, [filter]);

  return (
    <FilterContext.Provider
      value={{
        filter,
        setFilter,
        resetFilter,
        setKind,
        activeCount,
        refreshKey,
        bumpRefresh,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  return useContext(FilterContext);
}

export { EMPTY_FILTER };
