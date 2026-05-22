// Slide-Menü für Konto-Aktionen + häufige Schnellzugriffe.
// Geöffnet vom ☰-Knopf in der Navbar.

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useState } from "react";
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

import { backupAllToCloud, restoreFromCloud } from "../lib/cloudSync";
import { importRecipeFromJson } from "../lib/importExport";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../state/AuthContext";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ProfileMenu({ visible, onClose }: Props) {
  const { user, signOut } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Welche Aktion läuft gerade? Verhindert Doppelklick + zeigt Spinner.
  const [busy, setBusy] = useState<null | "backup" | "restore" | "import">(null);

  function handleCreateRecipe() {
    onClose();
    setTimeout(() => navigation.navigate("RecipeForm"), 50);
  }

  async function handleSignOut() {
    onClose();
    await new Promise((r) => setTimeout(r, 100));
    await signOut();
  }

  // --- Import einer geteilten JSON-Datei ----------------------------------
  async function handleImport() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "text/plain"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;

    setBusy("import");
    try {
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await importRecipeFromJson(content);
      onClose();
      Alert.alert("Importiert", "Das Rezept wurde zur Liste hinzugefügt.");
    } catch (err) {
      Alert.alert(
        "Import fehlgeschlagen",
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setBusy(null);
    }
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

  async function handleRestore() {
    setBusy("restore");
    try {
      const r = await restoreFromCloud();
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
              <Pressable
                onPress={onClose}
                hitSlop={8}
                accessibilityLabel="Schließen"
              >
                <Text style={styles.closeIcon}>✕</Text>
              </Pressable>
              <Text style={styles.title}>Menü</Text>
              <View style={styles.headerSpacer} />
            </View>

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
                  {busy === "import" && "Importiere…"}
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
                <MenuItem
                  icon="📥"
                  label="Rezept importieren"
                  onPress={handleImport}
                />

                <View style={styles.divider} />

                <MenuItem
                  icon="☁️"
                  label="In Cloud sichern"
                  onPress={handleBackup}
                />
                <MenuItem
                  icon="🔄"
                  label="Aus Cloud wiederherstellen"
                  onPress={confirmRestore}
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
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed,
      ]}
    >
      <Text style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        {icon}
      </Text>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
        {label}
      </Text>
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
    fontSize: fontSize.md,
    color: colors.textPrimary,
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
});
