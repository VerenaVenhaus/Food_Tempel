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

export type RecipeFilterState = {
  search: string;
  mealType: string | null;
  cuisines: string[];
  tagIds: string[];
  ingredientNames: string[];
  // Nährwerte-Filter (pro Portion). null = nicht gesetzt.
  maxCalories: number | null;
  minProtein: number | null;
};

const EMPTY_FILTER: RecipeFilterState = {
  search: "",
  mealType: null,
  cuisines: [],
  tagIds: [],
  ingredientNames: [],
  maxCalories: null,
  minProtein: null,
};

type FilterContextValue = {
  filter: RecipeFilterState;
  setFilter: (next: RecipeFilterState) => void;
  resetFilter: () => void;
  activeCount: number;
};

const FilterContext = createContext<FilterContextValue>({
  filter: EMPTY_FILTER,
  setFilter: () => {},
  resetFilter: () => {},
  activeCount: 0,
});

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<RecipeFilterState>(EMPTY_FILTER);

  const resetFilter = useCallback(() => setFilter(EMPTY_FILTER), []);

  // Wie viele Filter sind aktiv? Wird für das Badge auf dem Filter-Icon
  // genutzt. Volltext-Suche zählen wir hier NICHT mit, weil die ein
  // sichtbares Suchfeld hat.
  const activeCount = useMemo(() => {
    let n = 0;
    if (filter.mealType) n++;
    n += filter.cuisines.length;
    n += filter.tagIds.length;
    n += filter.ingredientNames.length;
    if (filter.maxCalories != null) n++;
    if (filter.minProtein != null) n++;
    return n;
  }, [filter]);

  return (
    <FilterContext.Provider value={{ filter, setFilter, resetFilter, activeCount }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  return useContext(FilterContext);
}

export { EMPTY_FILTER };
