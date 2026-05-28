// Karte für ein einzelnes Rezept in der Hauptliste.
// Zeigt Titel, optional Bild, Mahlzeitentyp und Kochzeit kompakt an.
// Ein Tap öffnet die Detail-Ansicht — onPress kommt vom Eltern-Screen.

import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { DRINK_LABEL_BY_VALUE } from "../data/drinkTypes";
import { formatMealTypes } from "../data/mealTypes";
import { colors, fontSize, fontWeight, radius, shadow, spacing } from "../theme";

type Props = {
  title: string;
  // Eine Zeile Vorschau unter dem Titel. `numberOfLines={1}` kürzt
  // automatisch mit "…", wenn der Text breiter ist als die Karte.
  shortDescription?: string | null;
  imageUri?: string | null;
  // Komma-separierte Liste aus der DB ("breakfast,snack"). formatMealTypes
  // bringt's für die Anzeige in lesbare Form ("Frühstück, Snack").
  mealType?: string | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  onPress: () => void;
};

export function RecipeCard({
  title,
  shortDescription,
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
        {/* Bis zu 2 Zeilen, dann mit "…" gekürzt — damit lange Titel die
            fixe Karten-Höhe (90 px) nicht sprengen. */}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {shortDescription ? (
          <Text style={styles.shortDescription} numberOfLines={1}>
            {shortDescription}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {mealType && (
            <View style={styles.badge}>
              <Text style={styles.badgeText} numberOfLines={1}>
                {formatMealTypes(mealType, DRINK_LABEL_BY_VALUE)}
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
    // Fixe Höhe = Bildhöhe. So bleibt die Karte konstant, egal ob eine
    // Kurzbeschreibung gepflegt ist oder nicht.
    height: 90,
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
    // Etwas straffere vertikale Polsterung, damit alle drei Zeilen
    // (Titel, optional Kurzbeschreibung, Tags/Zeit) sicher passen.
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    // Titel nach oben, Meta-Zeile nach unten — Kurzbeschreibung (falls da)
    // setzt sich automatisch in den Zwischenraum.
    justifyContent: "space-between",
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  shortDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
