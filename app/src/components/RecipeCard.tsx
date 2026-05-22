// Karte für ein einzelnes Rezept in der Hauptliste.
// Zeigt Titel, optional Bild, Mahlzeitentyp und Kochzeit kompakt an.
// Ein Tap öffnet die Detail-Ansicht — onPress kommt vom Eltern-Screen.

import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontSize, fontWeight, radius, shadow, spacing } from "../theme";

type Props = {
  title: string;
  imageUri?: string | null;
  mealType?: string | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  onPress: () => void;
};

// Deutsche Labels für die englischen Enum-Werte aus der DB
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Frühstück",
  lunch: "Mittag",
  dinner: "Abend",
  snack: "Snack",
  dessert: "Dessert",
};

export function RecipeCard({
  title,
  imageUri,
  mealType,
  prepTimeMinutes,
  cookTimeMinutes,
  onPress,
}: Props) {
  // Gesamtzeit berechnen, falls beide Werte da sind
  const totalTime =
    (prepTimeMinutes ?? 0) + (cookTimeMinutes ?? 0) || null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>🍽️</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        <View style={styles.metaRow}>
          {mealType && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {MEAL_LABELS[mealType] ?? mealType}
              </Text>
            </View>
          )}
          {totalTime && (
            <Text style={styles.metaText}>⏱ {totalTime} Min</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    marginVertical: spacing.xs,
    overflow: "hidden",
    ...shadow.card,
  },
  cardPressed: {
    opacity: 0.7,
  },
  image: {
    width: 90,
    height: 90,
  },
  imagePlaceholder: {
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: 36,
  },
  body: {
    flex: 1,
    padding: spacing.md,
    justifyContent: "space-between",
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: fontSize.xs,
    color: colors.primaryDark,
    fontWeight: fontWeight.medium,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
