// Eingabefeld für Zutat-Namen mit Autocomplete-Modal.
//
// UX-Idee:
// - Wirkt im "geschlossenen" Zustand wie ein normales Textfeld
// - Tap öffnet ein Modal mit Suchfeld
// - Während getippt wird, zeigen wir SOFORT bundled-Treffer (offline)
// - Parallel debounced (~300ms) holen wir OFF-Suggest-Treffer dazu
// - User tippt auf einen Vorschlag → Modal schließt, Name (+ Default-Einheit)
//   landen im Form
// - "Eigene Zutat verwenden" als Fallback → übernimmt den freien Suchtext
//
// Warum Modal statt Inline-Dropdown:
// Native Inline-Autocompletes sind in React Native hakelig (Tastatur
// versteckt Vorschläge, z-Index-Probleme in ScrollViews). Ein Modal
// ist robust und konsistent mit MultiSelectDropdown.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  COMMON_INGREDIENTS,
  DEFAULT_UNIT_BY_NAME,
} from "../data/commonIngredients";
import { suggestIngredientsFromOFF } from "../lib/ingredientSuggest";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = {
  value: string;
  // onChange erhält den neuen Namen UND ggf. eine vorgeschlagene Einheit.
  // Der Caller entscheidet, ob er die Einheit übernimmt (nur wenn das
  // Unit-Feld leer ist) — wir greifen ihm hier nicht vor.
  onChange: (name: string, suggestedUnit?: string) => void;
  placeholder?: string;
  // Bereits in der lokalen DB erfasste Zutaten — werden in die
  // Vorschlagsliste mit aufgenommen, damit der User konsistent benannte
  // Zutaten wiederfindet.
  knownNames?: string[];
};

const DEBOUNCE_MS = 300;
const MAX_BUNDLED_HITS = 12;

export function IngredientNameInput({
  value,
  onChange,
  placeholder = "Zutat",
  knownNames = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [offMatches, setOffMatches] = useState<string[]>([]);
  const [loadingOff, setLoadingOff] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Beim Öffnen des Modals: Suchfeld mit aktuellem Wert vorbelegen und
  // fokussieren, damit der User direkt weitertippen kann.
  function openModal() {
    setQuery(value);
    setDebouncedQuery(value);
    setOpen(true);
    // setTimeout, weil Focus VOR dem ersten Render der Modal-Inhalte
    // nicht greift. 50ms sind genug, fühlt sich nicht verzögert an.
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function closeModal() {
    setOpen(false);
  }

  // Debounce: erst 300ms nach dem letzten Tastendruck wird `debouncedQuery`
  // aktualisiert. So feuern wir nicht bei jedem Buchstaben einen API-Call.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  // Live-OFF-Abfrage. AbortController storniert die Anfrage, sobald der
  // User weitertippt — verhindert race conditions, in denen ein älteres
  // Ergebnis ein neueres überschreibt.
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setOffMatches([]);
      setLoadingOff(false);
      return;
    }
    const controller = new AbortController();
    setLoadingOff(true);
    suggestIngredientsFromOFF(debouncedQuery, controller.signal)
      .then((matches) => {
        if (!controller.signal.aborted) {
          setOffMatches(matches);
          setLoadingOff(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setOffMatches([]);
          setLoadingOff(false);
        }
      });
    return () => controller.abort();
  }, [debouncedQuery]);

  // Bundled + bereits-erfasste DB-Treffer. Sortierung:
  // 1) exakte Prefix-Treffer ("Apf*" für Suche "apf") nach oben
  // 2) Substring-Treffer drunter
  // Dedupe via Set, weil "Apfel" sowohl in bundled als auch in knownNames
  // stehen kann.
  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) {
      // Bei leerem Such-Term: zeig die ersten paar Bundled-Vorschläge,
      // damit der User auch ohne Tippen direkt was sieht.
      return COMMON_INGREDIENTS.slice(0, 8).map((i) => i.name);
    }
    const all = new Set<string>([
      ...COMMON_INGREDIENTS.map((i) => i.name),
      ...knownNames,
    ]);
    const prefix: string[] = [];
    const substring: string[] = [];
    for (const name of all) {
      const lower = name.toLowerCase();
      if (lower.startsWith(q)) prefix.push(name);
      else if (lower.includes(q)) substring.push(name);
    }
    prefix.sort((a, b) => a.localeCompare(b));
    substring.sort((a, b) => a.localeCompare(b));
    return [...prefix, ...substring].slice(0, MAX_BUNDLED_HITS);
  }, [query, knownNames]);

  function pick(name: string) {
    const suggestedUnit = DEFAULT_UNIT_BY_NAME[name];
    onChange(name, suggestedUnit);
    closeModal();
  }

  function pickAsTyped() {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    onChange(trimmed, DEFAULT_UNIT_BY_NAME[trimmed]);
    closeModal();
  }

  // Können wir den "Eigene Zutat verwenden"-Button anzeigen?
  // Nur wenn der getippte Text NICHT exakt schon in den Vorschlägen ist.
  const showCustomRow = useMemo(() => {
    const q = query.trim();
    if (q.length === 0) return false;
    if (localMatches.includes(q)) return false;
    if (offMatches.includes(q)) return false;
    return true;
  }, [query, localMatches, offMatches]);

  return (
    <>
      <Pressable
        onPress={openModal}
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
      >
        <Text
          style={[styles.fieldText, !value && styles.fieldPlaceholder]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={closeModal}
        transparent={false}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Zutat auswählen</Text>
            <Pressable onPress={closeModal} hitSlop={12}>
              <Text style={styles.modalClose}>Schließen</Text>
            </Pressable>
          </View>

          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Tippen, um zu suchen…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={pickAsTyped}
          />

          <FlatList
            data={localMatches}
            keyExtractor={(item) => `local:${item}`}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              showCustomRow ? (
                <Pressable
                  onPress={pickAsTyped}
                  style={({ pressed }) => [
                    styles.customRow,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <Text style={styles.customRowIcon}>＋</Text>
                  <Text style={styles.customRowText} numberOfLines={1}>
                    „{query.trim()}" als eigene Zutat verwenden
                  </Text>
                </Pressable>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => pick(item)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <Text style={styles.rowText} numberOfLines={1}>
                  {item}
                </Text>
                {DEFAULT_UNIT_BY_NAME[item] && (
                  <Text style={styles.rowUnit}>
                    {DEFAULT_UNIT_BY_NAME[item]}
                  </Text>
                )}
              </Pressable>
            )}
            ListFooterComponent={
              <View>
                {/* Weitere Online-Treffer — nahtlos in der Liste, ohne
                    sichtbaren Trenner. Nur ein dezenter Lade-Indikator,
                    während im Hintergrund nachgefragt wird. */}
                {loadingOff && offMatches.length === 0 && (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                  </View>
                )}
                {offMatches.map((name) => (
                  <Pressable
                    key={`off:${name}`}
                    onPress={() => pick(name)}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <Text style={styles.rowText} numberOfLines={1}>
                      {name}
                    </Text>
                  </Pressable>
                ))}
                {localMatches.length === 0 &&
                  offMatches.length === 0 &&
                  !loadingOff &&
                  query.trim().length >= 2 && (
                    <Text style={styles.emptyHint}>
                      Keine Treffer. Du kannst „{query.trim()}" über den
                      "+"-Button oben übernehmen.
                    </Text>
                  )}
              </View>
            }
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    height: 40,
    justifyContent: "center",
  },
  fieldPressed: {
    opacity: 0.7,
  },
  fieldText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  fieldPlaceholder: {
    color: colors.textMuted,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  modalClose: {
    fontSize: fontSize.sm,
    color: colors.freshDark,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    minHeight: 44,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  rowText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  rowUnit: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customRowIcon: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  customRowText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  loadingRow: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  emptyHint: {
    padding: spacing.lg,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});
