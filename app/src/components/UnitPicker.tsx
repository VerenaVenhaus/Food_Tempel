// Auswahlfeld für Mengen-Einheiten (g, ml, EL, Tasse, Prise, …).
//
// Funktioniert wie der IngredientNameInput:
//   - Geschlossen: einzeiliges Pressable-Feld mit dem aktuellen Wert
//   - Tap → Modal mit Suchfeld + gruppierter Liste
//   - "+ ‚xyz' als eigene Einheit verwenden" als Fallback für Exoten,
//     die nicht in der Standardliste stehen
//
// Warum nicht einfach ein TextInput mit Vorschlägen?
//   - Auf Mobil tippt man sich an einer Einheit ständig vertippt
//     ("teelöffel" vs. "TL"). Eine Liste macht die Auswahl eindeutig.
//   - Wir behalten freie Eingabe trotzdem — vom User ausdrücklich
//     gewünscht (Tasse, Schuss, Prise … aber gerne auch "Rispe"
//     oder Sonderschreibweisen).

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

import { KITCHEN_UNIT_GROUPS, KITCHEN_UNITS } from "../data/units";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

// Item-Typ für die FlatList. Wir mischen Gruppen-Header und Werte in
// einer flachen Liste, damit die List-Virtualisierung funktioniert.
type ListItem =
  | { kind: "header"; label: string }
  | { kind: "unit"; value: string };

export function UnitPicker({ value, onChange, placeholder = "g" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);

  function openModal() {
    setQuery("");
    setOpen(true);
    // Focus mit kleinem Delay, damit das Modal erst gemounted ist.
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function closeModal() {
    setOpen(false);
  }

  // Liste je nach Suchbegriff aufbauen.
  //  - Leerer Query: Gruppen-Header + alle Werte gruppiert.
  //  - Mit Query: flacher Filter über alle Werte (`includes`, ohne
  //    Gruppen-Header — bei kurzen Listen reicht das).
  const items = useMemo<ListItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return KITCHEN_UNIT_GROUPS.flatMap<ListItem>((g) => [
        { kind: "header", label: g.label },
        ...g.values.map<ListItem>((v) => ({ kind: "unit", value: v })),
      ]);
    }
    return KITCHEN_UNITS.filter((v) => v.toLowerCase().includes(q)).map<ListItem>(
      (v) => ({ kind: "unit", value: v }),
    );
  }, [query]);

  function pick(unit: string) {
    onChange(unit);
    closeModal();
  }

  function pickAsTyped() {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    onChange(trimmed);
    closeModal();
  }

  // "Eigene Einheit verwenden" nur zeigen, wenn der getippte Text nicht
  // schon exakt einem Standard-Wert entspricht (Case-insensitiv).
  const showCustomRow = useMemo(() => {
    const q = query.trim();
    if (q.length === 0) return false;
    return !KITCHEN_UNITS.some(
      (u) => u.toLowerCase() === q.toLowerCase(),
    );
  }, [query]);

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
            <Text style={styles.modalTitle}>Einheit wählen</Text>
            <Pressable onPress={closeModal} hitSlop={12}>
              <Text style={styles.modalClose}>Schließen</Text>
            </Pressable>
          </View>

          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Suchen oder eigene Einheit tippen…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={pickAsTyped}
          />

          <FlatList
            data={items}
            keyExtractor={(item, idx) =>
              item.kind === "header" ? `h-${item.label}` : `u-${item.value}-${idx}`
            }
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
                    „{query.trim()}" als eigene Einheit verwenden
                  </Text>
                </Pressable>
              ) : null
            }
            renderItem={({ item }) => {
              if (item.kind === "header") {
                return <Text style={styles.groupHeader}>{item.label}</Text>;
              }
              const selected =
                value.trim().toLowerCase() === item.value.toLowerCase();
              return (
                <Pressable
                  onPress={() => pick(item.value)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                    selected && styles.rowSelected,
                  ]}
                >
                  <Text
                    style={[styles.rowText, selected && styles.rowTextSelected]}
                    numberOfLines={1}
                  >
                    {item.value}
                  </Text>
                  {selected ? <Text style={styles.checkmark}>✓</Text> : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              query.trim().length > 0 ? (
                <Text style={styles.emptyHint}>
                  Keine Treffer. Über den „+"-Eintrag oben kannst du
                  „{query.trim()}" als eigene Einheit übernehmen.
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
  groupHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  rowSelected: {
    backgroundColor: colors.surface,
  },
  rowText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  rowTextSelected: {
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  checkmark: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.bold,
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
