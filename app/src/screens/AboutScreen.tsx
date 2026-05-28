// Über & Lizenzen — Quellenangaben für die in der App verwendeten Daten.
//
// Pflichten kurz erklärt:
// - BLS 4.0 steht unter CC BY 4.0 → MRI muss als Herausgeber genannt werden,
//   Lizenz verlinkt sein, und der Hinweis auf die Bearbeitung (wir nutzen nur
//   6 von 138 Nährstoffen) muss klar sein.
// - Open Food Facts: ODbL (Datenbank) + CC BY-SA 4.0 (Produkt-Inhalte) →
//   Namensnennung der Quelle.

import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {
    // Wenn kein Browser verfügbar ist (selten), still scheitern lassen — der
    // User sieht den Link ja als Text und kann ihn manuell öffnen.
  });
}

// Wiederverwendbarer Text-Link.
function LinkText({ url, children }: { url: string; children: string }) {
  return (
    <Pressable onPress={() => openUrl(url)} hitSlop={4}>
      <Text style={styles.link}>{children}</Text>
    </Pressable>
  );
}

export function AboutScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.intro}>
        Food_Tempel nutzt Daten aus zwei freien, öffentlich zugänglichen
        Datenbanken. Hier siehst du, woher Zutaten-Vorschläge und
        Nährwert-Berechnung stammen.
      </Text>

      {/* === Bundeslebensmittelschlüssel ============================ */}
      <View style={styles.card}>
        <Text style={styles.sourceTitle}>
          Bundeslebensmittelschlüssel (BLS) 4.0
        </Text>
        <Text style={styles.field}>
          <Text style={styles.label}>Herausgeber: </Text>
          Max Rubner-Institut (MRI), Karlsruhe — Bundesforschungsinstitut für
          Ernährung und Lebensmittel (2025)
        </Text>
        <Text style={styles.field}>
          <Text style={styles.label}>Verwendung in dieser App: </Text>
          Zutaten-Autocomplete (~7.140 Lebensmittel) und exakte
          Nährwert-Berechnung pro Rezept.
        </Text>
        <Text style={styles.field}>
          <Text style={styles.label}>Bearbeitungshinweis: </Text>
          Aus den 138 BLS-Nährstoffen werden in dieser App 6 verwendet
          (Kalorien, Eiweiß, Kohlenhydrate, Fett, Ballaststoffe, Zucker).
          Werte jeweils pro 100 g.
        </Text>
        <Text style={styles.field}>
          <Text style={styles.label}>Lizenz: </Text>
          Creative Commons Namensnennung 4.0 International (CC BY 4.0) ·{" "}
          <LinkText url="https://creativecommons.org/licenses/by/4.0/deed.de">
            Lizenztext lesen
          </LinkText>
        </Text>
        <Text style={styles.field}>
          <Text style={styles.label}>Quelle: </Text>
          <LinkText url="https://www.blsdb.de/">www.blsdb.de</LinkText>
        </Text>
      </View>

      {/* === Open Food Facts ======================================== */}
      <View style={styles.card}>
        <Text style={styles.sourceTitle}>Open Food Facts</Text>
        <Text style={styles.field}>
          <Text style={styles.label}>Verwendung in dieser App: </Text>
          Nährwert-Fallback für frei eingetippte Zutaten und Markenprodukte,
          die nicht im BLS enthalten sind.
        </Text>
        <Text style={styles.field}>
          <Text style={styles.label}>Lizenz: </Text>
          Datenbank unter Open Database License (ODbL); einzelne Produkt­
          inhalte unter Creative Commons Namensnennung-Weitergabe 4.0
          (CC BY-SA 4.0).
        </Text>
        <Text style={styles.field}>
          <Text style={styles.label}>Quelle: </Text>
          <LinkText url="https://world.openfoodfacts.org/">
            world.openfoodfacts.org
          </LinkText>
        </Text>
      </View>

      <Text style={styles.footer}>
        Diese App ist nicht von den oben genannten Organisationen entwickelt
        oder freigegeben — sie nutzt nur deren öffentlich bereitgestellte
        Daten unter den jeweils angegebenen Lizenzen.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  intro: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sourceTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  field: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  label: {
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  link: {
    fontSize: fontSize.sm,
    color: colors.freshDark,
    textDecorationLine: "underline",
  },
  footer: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
});
