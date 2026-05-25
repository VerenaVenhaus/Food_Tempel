// Multi-Select-Dropdown mit Suchfeld.
//
// Gedacht für Filter-Listen, in denen viele Einträge zur Auswahl stehen
// (z.B. alle Zutaten, die im Rezeptbestand vorkommen). Im "zu" Zustand
// zeigt die Komponente ein einzeiliges Feld — beim Tap öffnet sich ein
// Modal mit Suchfeld + Checkbox-Liste. Mehrere Werte werden gleichzeitig
// gewählt; "Fertig" schließt das Modal.
//
// Warum Modal statt Inline-Liste / Pop-Down:
// - Auf Mobil ist ein vollflächiges Modal die ehrlichste UX, sobald die
//   Auswahlliste lang werden kann (mit Such-Funktionalität)
// - Verhindert, dass die Filter-Section auf der Seite endlos lang wird

import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Option = { value: string; label: string };

type Props = {
  options: Option[];
  value: string[]; // ausgewählte values (Reihenfolge entspricht Auswahl-Reihenfolge)
  onChange: (next: string[]) => void;
  placeholder?: string;
  modalTitle?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
};

export function MultiSelectDropdown({
  options,
  value,
  onChange,
  placeholder = "Auswählen...",
  modalTitle = "Auswählen",
  searchPlaceholder = "Suchen...",
  emptyMessage = "Keine Einträge vorhanden.",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Liste live nach Suchbegriff filtern. useMemo, weil sonst bei jedem
  // Re-Render neu gefiltert würde (auch bei unverändertem Input).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Was im Feld stehen soll, wenn das Modal geschlossen ist. Bei vielen
  // Treffern kürzen wir mit "+N", sonst wird das Feld zu breit.
  const labelText = useMemo(() => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) return value[0];
    if (value.length === 2) return value.join(", ");
    return `${value[0]}, ${value[1]} +${value.length - 2}`;
  }, [value, placeholder]);

  function toggle(v: string) {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  }

  function closeAndReset() {
    setOpen(false);
    setQuery(""); // Suchbegriff beim Schließen zurücksetzen
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
      >
        <Text
          style={[
            styles.fieldText,
            value.length === 0 && styles.fieldPlaceholder,
          ]}
          numberOfLines={1}
        >
          {labelText}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={closeAndReset}
        transparent={false}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Pressable onPress={closeAndReset} hitSlop={12}>
              <Text style={styles.modalClose}>Schließen</Text>
            </Pressable>
          </View>

          {options.length > 0 && (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
          )}

          {options.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = value.includes(item.value);
                return (
                  <Pressable
                    onPress={() => toggle(item.value)}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        selected && styles.checkboxSelected,
                      ]}
                    >
                      {selected && <Text style={styles.check}>✓</Text>}
                    </View>
                    <Text style={styles.rowText} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    Keine Treffer für „{query}".
                  </Text>
                </View>
              }
            />
          )}

          <View style={styles.modalFooter}>
            {value.length > 0 && (
              <Pressable
                onPress={() => onChange([])}
                style={styles.footerSecondary}
              >
                <Text style={styles.footerSecondaryText}>Alle abwählen</Text>
              </Pressable>
            )}
            <Pressable onPress={closeAndReset} style={styles.footerPrimary}>
              <Text style={styles.footerPrimaryText}>
                {value.length > 0 ? `Fertig (${value.length})` : "Fertig"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Das "Feld" wenn Modal geschlossen ist
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  fieldPressed: {
    opacity: 0.7,
  },
  fieldText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  fieldPlaceholder: {
    color: colors.textMuted,
  },
  chevron: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },

  // Modal
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
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  check: {
    color: "#fff",
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    lineHeight: 16,
  },
  rowText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Footer-Bar mit Aktionen
  modalFooter: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  footerSecondary: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  footerSecondaryText: {
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  footerPrimary: {
    flex: 2,
    backgroundColor: colors.fresh,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  footerPrimaryText: {
    color: "#fff",
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
