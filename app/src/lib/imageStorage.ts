// Kopiert ein per ImagePicker gewähltes Bild aus dem (temporären) Cache-
// Verzeichnis in den permanenten App-Speicher und gibt die neue URI zurück.
//
// HINTERGRUND
// expo-image-picker liefert standardmäßig eine URI wie
//   file:///data/user/0/de.foodtempel.app/cache/ImagePicker/abc.jpg
// — also einen Pfad ins Cache-Verzeichnis. Android kann diesen Cache
// JEDERZEIT leeren: bei App-Updates, bei Speicher-Knappheit, beim
// manuellen "Cache löschen", oder wenn der User die App deinstalliert
// und neu installiert. Bei uns bisher: SQLite-Daten bleiben, aber die
// referenzierten Bild-Dateien sind weg → kaputte Bilder im Detail-Screen.
//
// LÖSUNG
// Beim Auswählen kopieren wir das Bild EINMALIG ins documentDirectory
// (`...appdata/files/recipe-images/`). Dieses Verzeichnis wird NUR bei
// kompletter App-Deinstallation geleert — überlebt also App-Updates und
// Android-Cache-Cleanups.
//
// Hinweis zur API: expo-file-system 19 (SDK 54) hat die alten Top-Level-
// Funktionen (copyAsync, getInfoAsync, …) durch `File` / `Directory` /
// `Paths` ersetzt. Die alten Funktionen würden Laufzeit-Fehler werfen —
// daher hier die neue API.

import { Directory, File, Paths } from "expo-file-system";

const IMAGES_SUBDIR = "recipe-images";

/**
 * Kopiert das Bild der gegebenen Quell-URI in den App-permanenten Speicher.
 * Liefert die neue file:///…-URI zurück, die dauerhaft gültig bleibt.
 *
 * Wirft, wenn das Quell-Bild nicht gelesen werden kann (selten — Galerie-
 * URIs sind über die system Content-Provider abrufbar).
 */
export function persistImage(sourceUri: string): string {
  // Datei-Endung aus der Quelle ziehen, sonst Default jpg. Wir whitelisten
  // gängige Bild-Endungen — wenn der Picker mal exotisches liefert, landen
  // wir bei jpg, das funktioniert visuell weiterhin.
  const dot = sourceUri.lastIndexOf(".");
  const slash = sourceUri.lastIndexOf("/");
  const rawExt =
    dot > slash && dot >= 0 ? sourceUri.slice(dot + 1).toLowerCase() : "";
  const ext = ["jpg", "jpeg", "png", "webp", "heic"].includes(rawExt)
    ? rawExt
    : "jpg";

  // Eindeutiger Dateiname (Zeitstempel + Zufall) — kollidiert auch dann
  // nicht, wenn der User zweimal in derselben Millisekunde wählt.
  const name = `${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;

  // Ziel-Verzeichnis sicherstellen. `idempotent: true` heißt: kein Fehler,
  // wenn schon vorhanden.
  const dir = new Directory(Paths.document, IMAGES_SUBDIR);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }

  // Source → Ziel. `copy` ist synchron und akzeptiert sowohl `file://`-
  // (Kamera) als auch `content://`-URIs (Galerie auf Android).
  const source = new File(sourceUri);
  const target = new File(dir, name);
  source.copy(target);

  return target.uri;
}
