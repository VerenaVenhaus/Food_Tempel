// Suchfeld oben auf der Hauptseite. Reicht den Eingabe-String per onChangeText
// nach oben durch — die Filterung passiert in der Eltern-Komponente.
//
// Optional zeigt der Filter-Button ein Badge mit der Anzahl aktiver Filter.

import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  filterBadge?: number; // Anzahl aktiver Filter; 0 = kein Badge
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Rezept suchen…",
  onFilterPress,
  filterBadge = 0,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <Text style={styles.icon}>🔍</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChangeText("")} hitSlop={8}>
            <Text style={styles.clearIcon}>✕</Text>
          </Pressable>
        )}
      </View>

      {onFilterPress && (
        <Pressable
          onPress={onFilterPress}
          style={({ pressed }) => [
            styles.filterButton,
            pressed && styles.filterButtonPressed,
          ]}
          accessibilityLabel="Filter öffnen"
        >
          {/* Echtes Trichter-Icon aus @expo/vector-icons. "funnel-outline"
              ist nur die Kontur — innen also transparent (zeigt den
              grünen Knopf-Hintergrund). */}
          <Ionicons
            name="funnel-outline"
            size={20}
            color={colors.textSecondary}
          />
          {filterBadge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{filterBadge}</Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    outlineStyle: "none" as never,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  filterButton: {
    // Heller, freundlicher Hintergrund mit oranger Umrandung.
    backgroundColor: colors.freshLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonPressed: {
    opacity: 0.7,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
});
