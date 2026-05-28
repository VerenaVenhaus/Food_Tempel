// Slide-Menü für Konto-Aktionen + häufige Schnellzugriffe.
// Geöffnet vom ☰-Knopf in der Navbar.

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  backupAllToCloud,
  clearCloudBackup,
  restoreFromCloud,
} from "../lib/cloudSync";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../state/AuthContext";
import { useFilter } from "../state/FilterContext";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ProfileMenu({ visible, onClose }: Props) {
  const { user, signOut } = useAuth();
  const { bumpRefresh } = useFilter();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Welche Aktion läuft gerade? Verhindert Doppelklick + zeigt Spinner.
  const [busy, setBusy] = useState<null | "backup" | "restore" | "clear">(null);
  // Interne View des Menüs: "menu" (Default) oder "chooser" (zeigt Essen/
  // Getränk-Auswahl bevor zum Form-Screen navigiert wird).
  const [view, setView] = useState<"menu" | "chooser">("menu");
  // Cloud-Unterpunkte (Sichern/Wiederherstellen/Leeren) sind unter einem
  // einzigen "Cloud"-Eintrag zusammengefasst und werden per Klick aufgeklappt.
  const [cloudExpanded, setCloudExpanded] = useState(false);

  // Beim Schließen des Modals zurück auf die Menü-Ansicht und Cloud zuklappen
  // — sonst landet der User beim nächsten Öffnen mitten im Chooser oder mit
  // bereits geöffneter Untergruppe, was er nicht erwartet.
  useEffect(() => {
    if (!visible) {
      setView("menu");
      setCloudExpanded(false);
    }
  }, [visible]);

  function handleCreateRecipe() {
    // Statt direkt zu navigieren öffnen wir die kleine Auswahl: Essen oder
    // Getränk? Essen ist visuell vorausgewählt (primary-styled).
    setView("chooser");
  }

  function chooseKind(kind: "food" | "drink") {
    onClose();
    setTimeout(() => navigation.navigate("RecipeForm", { kind }), 50);
  }

  async function handleSignOut() {
    onClose();
    await new Promise((r) => setTimeout(r, 100));
    await signOut();
  }

  function handleAbout() {
    // setTimeout, weil das Modal sonst noch im Vordergrund ist, wenn die
    // Navigation passiert — dann sieht der User kurz nichts.
    onClose();
    setTimeout(() => navigation.navigate("About"), 50);
  }

  // --- Cloud-Backup --------------------------------------------------------
  async function handleBackup() {
    setBusy("backup");
    try {
      const r = await backupAllToCloud();
      onClose();
      const failedMsg =
        r.failed.length > 0
          ? `\n\nFehlgeschlagen: ${r.failed.length}\n${r.failed.map((f) => "• " + f.title).join("\n")}`
          : "";
      Alert.alert(
        "Cloud-Backup",
        `${r.uploaded} Rezept(e) gesichert.${failedMsg}`,
      );
    } catch (err) {
      Alert.alert(
        "Backup fehlgeschlagen",
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setBusy(null);
    }
  }

  async function confirmRestore() {
    Alert.alert(
      "Aus Cloud wiederherstellen?",
      "Rezepte, die schon lokal existieren, werden übersprungen (kein Überschreiben).",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Wiederherstellen", onPress: handleRestore },
      ],
    );
  }

  function confirmClearCloud() {
    Alert.alert(
      "Cloud-Backup löschen?",
      "Alle deine Cloud-Daten werden entfernt. Die lokalen Rezepte auf diesem Gerät bleiben unverändert.",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Löschen", style: "destructive", onPress: handleClearCloud },
      ],
    );
  }

  async function handleClearCloud() {
    setBusy("clear");
    try {
      const count = await clearCloudBackup();
      onClose();
      Alert.alert("Cloud geleert", `${count} Cloud-Rezept(e) wurden entfernt.`);
    } catch (err) {
      Alert.alert(
        "Löschen fehlgeschlagen",
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    setBusy("restore");
    try {
      const r = await restoreFromCloud();
      if (r.imported > 0) bumpRefresh();
      onClose();
      Alert.alert(
        "Wiederhergestellt",
        `Neu: ${r.imported}, übersprungen (schon da): ${r.skipped}` +
          (r.failed.length > 0 ? `\nFehler: ${r.failed.length}` : ""),
      );
    } catch (err) {
      Alert.alert(
        "Wiederherstellen fehlgeschlagen",
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panelRight} onPress={() => {}}>
          <SafeAreaView edges={["top"]}>
            <View style={styles.header}>
              {view === "chooser" ? (
                <Pressable
                  onPress={() => setView("menu")}
                  hitSlop={8}
                  accessibilityLabel="Zurück"
                >
                  <Text style={styles.closeIcon}>‹</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={onClose}
                  hitSlop={8}
                  accessibilityLabel="Schließen"
                >
                  <Text style={styles.closeIcon}>✕</Text>
                </Pressable>
              )}
              <Text style={styles.title}>
                {view === "chooser" ? "Was anlegen?" : "Menü"}
              </Text>
              <View style={styles.headerSpacer} />
            </View>

            {view === "chooser" ? (
              <KindChooser onSelect={chooseKind} />
            ) : (
              <>
                <View style={styles.accountBox}>
                  <Text style={styles.accountLabel}>Angemeldet als</Text>
                  <Text style={styles.accountEmail} numberOfLines={1}>
                    {user?.email ?? "(unbekannt)"}
                  </Text>
                </View>

                {busy ? (
                  <View style={styles.busyRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.busyText}>
                      {busy === "backup" && "Sichere zu Cloud…"}
                      {busy === "restore" && "Lade aus Cloud…"}
                      {busy === "clear" && "Lösche Cloud-Backup…"}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.divider} />

                    <MenuItem
                      icon="＋"
                      label="Rezept erstellen"
                      onPress={handleCreateRecipe}
                    />

                    <View style={styles.divider} />

                    {/* Aufklappbarer Cloud-Block — drei Aktionen, die unter
                        einem einzigen Eintrag zusammengefasst sind, damit das
                        Hauptmenü ruhiger wirkt. */}
                    <MenuItem
                      icon="☁️"
                      label="Cloud"
                      chevron={cloudExpanded ? "up" : "down"}
                      onPress={() => setCloudExpanded((v) => !v)}
                    />
                    {cloudExpanded && (
                      <>
                        <MenuItem
                          icon="💾"
                          label="In Cloud sichern"
                          indent
                          onPress={handleBackup}
                        />
                        <MenuItem
                          icon="🔄"
                          label="Aus Cloud wiederherstellen"
                          indent
                          onPress={confirmRestore}
                        />
                        <MenuItem
                          icon="🧹"
                          label="Cloud-Backup leeren"
                          indent
                          onPress={confirmClearCloud}
                        />
                      </>
                    )}

                    <View style={styles.divider} />

                    <MenuItem
                      icon="ℹ️"
                      label="Über & Lizenzen"
                      onPress={handleAbout}
                    />

                    <View style={styles.divider} />

                    <MenuItem
                      icon="🚪"
                      label="Abmelden"
                      danger
                      onPress={handleSignOut}
                    />
                  </>
                )}
              </>
            )}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Auswahl Essen/Getränk vor dem Anlegen eines neuen Rezepts. Essen ist die
// primary-Karte → visuell vorausgewählt. Tap auf eine Karte ruft onSelect auf.
function KindChooser({
  onSelect,
}: {
  onSelect: (kind: "food" | "drink") => void;
}) {
  return (
    <View style={styles.chooserWrap}>
      <Text style={styles.chooserHint}>
        Was möchtest du anlegen?
      </Text>
      <Pressable
        onPress={() => onSelect("food")}
        style={({ pressed }) => [
          styles.chooserCard,
          styles.chooserCardPrimary,
          pressed && styles.chooserCardPressed,
        ]}
      >
        <Text style={styles.chooserIcon}>🍽️</Text>
        <View style={styles.chooserCardText}>
          <Text style={[styles.chooserTitle, styles.chooserTitlePrimary]}>
            Essen
          </Text>
          <Text style={[styles.chooserSub, styles.chooserSubPrimary]}>
            Rezept mit Mahlzeit-Typen, Anlass usw.
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => onSelect("drink")}
        style={({ pressed }) => [
          styles.chooserCard,
          pressed && styles.chooserCardPressed,
        ]}
      >
        <Text style={styles.chooserIcon}>🥤</Text>
        <View style={styles.chooserCardText}>
          <Text style={styles.chooserTitle}>Getränk</Text>
          <Text style={styles.chooserSub}>
            Mit Getränketyp und Alkohol-Tags
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
  // Wenn gesetzt, erscheint rechts ein kleines Dreieck-Symbol — visualisiert
  // einen aufklappbaren Bereich (z.B. "Cloud" mit Unterpunkten).
  chevron,
  // Tiefere linke Einrückung — für Unterpunkte eines aufgeklappten Bereichs.
  indent,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  chevron?: "down" | "up";
  indent?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        indent && styles.menuItemIndent,
        pressed && styles.menuItemPressed,
      ]}
    >
      <Text style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        {icon}
      </Text>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
        {label}
      </Text>
      {chevron && (
        <Text style={styles.menuChevron}>
          {chevron === "down" ? "▾" : "▴"}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  panelRight: {
    width: "75%",
    maxWidth: 320,
    height: "100%",
    backgroundColor: colors.background,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  closeIcon: {
    fontSize: 22,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
  },
  headerSpacer: {
    width: 32,
  },
  accountBox: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: radius.md,
    gap: 4,
  },
  accountLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  accountEmail: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuItemPressed: {
    backgroundColor: colors.surface,
  },
  menuIcon: {
    fontSize: 22,
    width: 28,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  menuIconDanger: {
    color: colors.danger,
  },
  menuLabel: {
    flex: 1, // damit ein Chevron-Symbol rechts am Zeilenrand sitzt
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  menuItemIndent: {
    paddingLeft: spacing.xl, // sichtbar tieferer Einzug für Unterpunkte
  },
  menuChevron: {
    fontSize: 36, // doppelt so groß wie vorher (18) — bewusst gewählter Wert
    color: colors.textMuted,
    paddingLeft: spacing.sm,
  },
  menuLabelDanger: {
    color: colors.danger,
    fontWeight: fontWeight.semibold,
  },
  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  busyText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },

  // Kind-Chooser: zwei große Karten zur Wahl Essen vs. Getränk.
  chooserWrap: {
    padding: spacing.md,
    gap: spacing.md,
  },
  chooserHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  chooserCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  // Primary-Variante = "Essen ist vorausgewählt" optisch
  chooserCardPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chooserCardPressed: {
    opacity: 0.7,
  },
  chooserIcon: {
    fontSize: 36,
  },
  chooserCardText: {
    flex: 1,
    gap: 2,
  },
  chooserTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  chooserTitlePrimary: {
    color: "#fff",
  },
  chooserSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  chooserSubPrimary: {
    color: "rgba(255,255,255,0.85)",
  },
});
