// Eingabefeld für Zutat-Namen mit Autocomplete-Modal.
//
// Quelle der Vorschläge: der gerätelokale Bundeslebensmittelschlüssel (BLS,
// ~7.140 Lebensmittel). Wählt der User einen Vorschlag, geben wir den Namen
// UND den BLS-Code zurück — letzterer erlaubt später eine exakte
// Nährwert-Berechnung (z.B. "Apfel roh" ≠ "Apfelsaft").
//
// UX-Idee:
// - Wirkt im "geschlossenen" Zustand wie ein normales Textfeld
// - Tap öffnet ein Modal mit Suchfeld
// - Während getippt wird, zeigen wir sofort passende BLS-Treffer (offline)
// - Tap auf einen Treffer → Modal schließt, Name (+ Code) landen im Form
// - "Eigene Zutat verwenden" als Fallback → freier Text, Code = null
//
// Warum Modal statt Inline-Dropdown: native Inline-Autocompletes sind in
// React Native hakelig (Tastatur verdeckt Vorschläge, z-Index in ScrollViews).
// Ein Modal ist robust und konsistent mit MultiSelectDropdown.

import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { searchBlsFoods, type BlsFoodSuggestion } from "../db/repositories";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = {
  value: string;
  // onChange erhält den gewählten Namen und den BLS-Code (oder null, wenn der
  // User eine eigene Zutat eingetippt hat).
  onChange: (name: string, blsCode: string | null) => void;
  placeholder?: string;
};

export function IngredientNameInput({
  value,
  onChange,
  placeholder = "Zutat",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);

  // Beim Öffnen des Modals: Suchfeld mit aktuellem Wert vorbelegen und
  // fokussieren, damit der User direkt weitertippen kann.
  function openModal() {
    setQuery(value);
    setOpen(true);
    // setTimeout, weil Focus VOR dem ersten Render der Modal-Inhalte nicht
    // greift. 50ms sind genug, fühlt sich nicht verzögert an.
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function closeModal() {
    setOpen(false);
  }

  // BLS-Treffer zum aktuellen Suchtext. searchBlsFoods ist synchron und bei
  // ~7.140 Zeilen nur wenige Millisekunden — daher direkt im useMemo.
  const matches = useMemo<BlsFoodSuggestion[]>(
    () => searchBlsFoods(query),
    [query],
  );

  function pick(item: BlsFoodSuggestion) {
    onChange(item.name, item.code);
    closeModal();
  }

  function pickAsTyped() {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    onChange(trimmed, null);
    closeModal();
  }

  // "Eigene Zutat verwenden" nur zeigen, wenn der getippte Text nicht exakt
  // schon einem Vorschlag entspricht.
  const showCustomRow = useMemo(() => {
    const q = query.trim();
    if (q.length === 0) return false;
    return !matches.some((m) => m.name === q);
  }, [query, matches]);

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
            data={matches}
            keyExtractor={(item) => item.code}
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
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Text style={styles.rowText} numberOfLines={1}>
                  {item.name}
                </Text>
              </Pressable>
            )}
            ListFooterComponent={
              matches.length === 0 && query.trim().length >= 2 ? (
                <Text style={styles.emptyHint}>
                  Keine BLS-Treffer. Du kannst „{query.trim()}" über den
                  „+"-Button oben als eigene Zutat übernehmen.
                </Text>
              ) : query.trim().length < 2 ? (
                <Text style={styles.emptyHint}>
                  Mindestens 2 Buchstaben eingeben…
                </Text>
              ) : null
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
  emptyHint: {
    padding: spacing.lg,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});
