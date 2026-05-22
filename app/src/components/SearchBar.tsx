// Suchfeld oben auf der Hauptseite. Reicht den Eingabe-String per onChangeText
// nach oben durch — die Filterung passiert in der Eltern-Komponente.
//
// Optional zeigt der Filter-Button ein Badge mit der Anzahl aktiver Filter.

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
          <Text style={styles.filterIcon}>⚙️</Text>
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
    // Heller, freundlicher Hintergrund mit zarter Umrandung — wirkt
    // weniger "Plakat", besser zum natürlichen Look der App.
    backgroundColor: colors.freshLight,
    borderWidth: 1,
    borderColor: colors.fresh,
    borderRadius: radius.pill,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonPressed: {
    opacity: 0.7,
  },
  filterIcon: {
    fontSize: 24,
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
