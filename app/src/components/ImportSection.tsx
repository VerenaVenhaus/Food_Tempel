// "Aus … importieren"-Bereich für das Rezept-Formular.
//
// Drei Buttons:
//   📷 Foto wählen      → Galerie oder Kamera → OpenAI Vision
//   🌐 Aus Webseite     → User gibt URL ein → Scraping + OpenAI
//   📄 PDF importieren  → Datei wählen → Text extrahieren + OpenAI
//
// Bei erfolgreichem Import ruft die Komponente onImport(recipe) — die
// Eltern-Komponente (RecipeFormScreen) befüllt dann die Felder.

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  extractFromPdf,
  extractFromPhoto,
  extractFromUrl,
  type ExtractedRecipe,
} from "../lib/api";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = {
  onImport: (recipe: ExtractedRecipe) => void;
  // food vs drink wurde vom User in der Form vorab gewählt (KindChooser).
  // Wir reichen es an die KI durch, damit sie die richtige mealType-Liste
  // nutzt — die KI bestimmt das NICHT selbst.
  kind: "food" | "drink";
};

// Liest eine lokale Datei (file:// URI) und gibt den Inhalt als Base64.
async function readFileAsBase64(uri: string): Promise<string> {
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export function ImportSection({ onImport, kind }: Props) {
  const [loading, setLoading] = useState<null | "photo" | "url" | "pdf">(null);
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  function handleSuccess(recipe: ExtractedRecipe) {
    onImport(recipe);
    // Kleines visuelles Feedback. Der User sieht dann sofort die befüllten Felder.
    Alert.alert(
      "Importiert",
      "Felder wurden aus der KI-Antwort vorbefüllt. Bitte noch prüfen und ggf. anpassen.",
    );
  }

  function handleError(action: string, err: string) {
    Alert.alert(
      `${action} fehlgeschlagen`,
      err +
        "\n\nMögliche Ursachen:\n• Backend nicht gestartet\n• GEMINI_API_KEY fehlt in backend/.env\n• Internet-Problem",
    );
  }

  // ----- 📷 Foto aus Galerie -----------------------------------------------
  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Berechtigung fehlt",
        "Bitte erlaube den Zugriff auf deine Galerie.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert("Fehler", "Bild konnte nicht gelesen werden.");
      return;
    }

    setLoading("photo");
    const res = await extractFromPhoto(asset.base64, "image/jpeg", kind);
    setLoading(null);

    if (res.ok) {
      // Das hochgeladene Foto ist die ganze Rezept-Seite — bewusst KEIN
      // imageUri setzen. Der User kann später manuell ein Bild hinzufügen.
      handleSuccess(res.data);
    } else {
      handleError("Foto-Import", res.error);
    }
  }

  // ----- 📸 Foto direkt aus Kamera ----------------------------------------
  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Berechtigung fehlt",
        "Bitte erlaube den Zugriff auf die Kamera.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert("Fehler", "Bild konnte nicht gelesen werden.");
      return;
    }

    setLoading("photo");
    const res = await extractFromPhoto(asset.base64, "image/jpeg", kind);
    setLoading(null);

    if (res.ok) {
      // Wie beim Galerie-Foto: kein imageUri vom Original-Bild setzen.
      handleSuccess(res.data);
    } else {
      handleError("Kamera-Import", res.error);
    }
  }

  // ----- 🌐 URL ------------------------------------------------------------
  async function importUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setUrlModalVisible(false);
    setLoading("url");
    const res = await extractFromUrl(url, kind);
    setLoading(null);
    setUrlInput("");

    if (res.ok) handleSuccess(res.data);
    else handleError("URL-Import", res.error);
  }

  // ----- 📄 PDF ------------------------------------------------------------
  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    setLoading("pdf");
    try {
      const base64 = await readFileAsBase64(asset.uri);
      const res = await extractFromPdf(base64, kind);
      setLoading(null);

      if (res.ok) handleSuccess(res.data);
      else handleError("PDF-Import", res.error);
    } catch (err) {
      setLoading(null);
      handleError("PDF-Import", err instanceof Error ? err.message : String(err));
    }
  }

  // Wenn ein Import läuft, zeigen wir einen Spinner statt der Buttons,
  // damit der User nicht zweimal klickt.
  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>
          {loading === "photo" && "Foto wird analysiert…"}
          {loading === "url" && "Webseite wird gelesen…"}
          {loading === "pdf" && "PDF wird ausgelesen…"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Importieren</Text>
      <Text style={styles.hint}>
        Lass die KI das Rezept aus einer Quelle vorbefüllen — du kannst danach
        alle Felder noch anpassen.
      </Text>

      <View style={styles.buttonRow}>
        <ImportButton icon="📷" label="Foto" onPress={pickPhoto} />
        <ImportButton icon="📸" label="Kamera" onPress={takePhoto} />
      </View>
      <View style={styles.buttonRow}>
        <ImportButton
          icon="🌐"
          label="Webseite"
          onPress={() => setUrlModalVisible(true)}
        />
        <ImportButton icon="📄" label="PDF" onPress={pickPdf} />
      </View>

      {/* URL-Eingabe-Modal */}
      <Modal
        visible={urlModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setUrlModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setUrlModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Webseite importieren</Text>
            <Text style={styles.modalHint}>
              Trage die URL einer Rezept-Webseite ein. Die KI extrahiert dann
              den Inhalt.
            </Text>
            <TextInput
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="https://…"
              placeholderTextColor={colors.textMuted}
              style={styles.modalInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <Pressable
                onPress={() => setUrlModalVisible(false)}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <Text style={styles.modalButtonCancelText}>Abbrechen</Text>
              </Pressable>
              <Pressable
                onPress={importUrl}
                style={[styles.modalButton, styles.modalButtonPrimary]}
              >
                <Text style={styles.modalButtonPrimaryText}>Importieren</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ImportButton({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonIcon}>{icon}</Text>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.freshLight,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.fresh,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.freshDark,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  buttonPressed: {
    opacity: 0.7,
    backgroundColor: colors.surface,
  },
  buttonIcon: {
    fontSize: 24,
  },
  buttonLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  loadingBox: {
    backgroundColor: colors.freshLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.fresh,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.freshDark,
    fontWeight: fontWeight.medium,
  },
  // Modal-Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  modalHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    minHeight: 44,
    outlineStyle: "none" as never,
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  modalButtonCancel: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonCancelText: {
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  modalButtonPrimary: {
    backgroundColor: colors.fresh,
  },
  modalButtonPrimaryText: {
    color: "#fff",
    fontWeight: fontWeight.bold,
  },
});
