// Bild-Auswahl für das Rezept-Formular.
// Bietet zwei Buttons: Galerie und Kamera. Zeigt das aktuelle Bild als
// Vorschau. Beim Klick erscheinen native iOS/Android-Dialoge für die
// Auswahl bzw. die Kamera.
//
// Wir speichern hier nur den lokalen URI (z.B. "file:///data/.../recipe.jpg").
// Das Bild bleibt in Expos eigenem Cache-Ordner. In Phase 9 ziehen wir
// es ggf. in den permanenten App-Speicher oder Cloud-Storage um.

import * as ImagePicker from "expo-image-picker";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = {
  value: string | null;
  onChange: (uri: string | null) => void;
};

export function ImagePickerField({ value, onChange }: Props) {
  async function pickFromLibrary() {
    // Permission abfragen — der User sieht beim ersten Mal einen System-Dialog.
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Berechtigung fehlt",
        "Bitte erlaube den Zugriff auf deine Galerie, um ein Bild auszuwählen.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7, // 70% — spart Speicher, sieht trotzdem gut aus
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      onChange(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Berechtigung fehlt",
        "Bitte erlaube den Zugriff auf die Kamera, um ein Foto aufzunehmen.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      onChange(result.assets[0].uri);
    }
  }

  function removeImage() {
    onChange(null);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Bild</Text>

      {value ? (
        <View>
          <Image source={{ uri: value }} style={styles.preview} />
          <Pressable onPress={removeImage} style={styles.removeButton}>
            <Text style={styles.removeText}>Bild entfernen</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>📷</Text>
          <Text style={styles.placeholderText}>Noch kein Bild</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <Pressable onPress={pickFromLibrary} style={styles.button}>
          <Text style={styles.buttonText}>Aus Galerie</Text>
        </Pressable>
        <Pressable onPress={takePhoto} style={styles.button}>
          <Text style={styles.buttonText}>Foto aufnehmen</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  placeholder: {
    height: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  placeholderIcon: {
    fontSize: 36,
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  button: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  removeButton: {
    paddingVertical: spacing.xs,
    alignItems: "center",
  },
  removeText: {
    color: colors.danger,
    fontSize: fontSize.sm,
  },
});
