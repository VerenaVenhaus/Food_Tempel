// Slide-Menü für Konto-Aktionen + häufige Schnellzugriffe.
// Geöffnet vom ☰-Knopf in der Navbar. Lässt sich später leicht erweitern
// (Einstellungen, Theme, Cloud-Sync, App-Info, ...).

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../state/AuthContext";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ProfileMenu({ visible, onClose }: Props) {
  const { user, signOut } = useAuth();
  // useNavigation: gibt uns das navigation-Objekt für Stack-Aktionen,
  // ohne dass wir es als Prop reinreichen müssen.
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  function handleCreateRecipe() {
    onClose();
    // Kleine Verzögerung, damit das Modal sauber schließt, bevor der
    // RecipeForm-Modal sich öffnet (sonst können Animationen kollidieren).
    setTimeout(() => navigation.navigate("RecipeForm"), 50);
  }

  async function handleSignOut() {
    onClose();
    await new Promise((r) => setTimeout(r, 100));
    await signOut();
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      {/* Halbtransparenter Hintergrund — tap schließt das Menü */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Panel rechts statt links — passt zum Menü-Icon rechts in der Navbar */}
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
              {/* Leerer View damit der Titel zentriert sitzt */}
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.accountBox}>
              <Text style={styles.accountLabel}>Angemeldet als</Text>
              <Text style={styles.accountEmail} numberOfLines={1}>
                {user?.email ?? "(unbekannt)"}
              </Text>
            </View>

            <View style={styles.divider} />

            <MenuItem
              icon="＋"
              label="Rezept erstellen"
              onPress={handleCreateRecipe}
            />

            <View style={styles.divider} />

            <MenuItem
              icon="🚪"
              label="Abmelden"
              danger
              onPress={handleSignOut}
            />
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
});
