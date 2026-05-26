// Reagiert auf eingehende foodtempel://-URLs.
//
// Wenn ein User in WhatsApp / E-Mail / SMS auf einen geteilten Rezept-Link
// tippt, öffnet das Handy unsere App und gibt die URL an uns weiter. Hier
// parsen wir sie, fragen kurz nach und legen das Rezept lokal an.
//
// Die Komponente rendert nichts — sie ist nur dafür da, den Listener am
// Leben zu halten. Wir platzieren sie irgendwo unter dem FilterProvider,
// damit sie nach erfolgreichem Import die Rezeptliste auf der Startseite
// auffrischen kann.

import * as Linking from "expo-linking";
import { useEffect } from "react";
import { Alert } from "react-native";

import { importRecipeFromJson } from "../lib/importExport";
import { useFilter } from "../state/FilterContext";

const IMPORT_PATH = "import";

export function DeepLinkHandler() {
  const { bumpRefresh } = useFilter();

  useEffect(() => {
    // Wird ein Link verarbeitet, der schon offen liegt? Beim Cold-Start
    // der App (z.B. via WhatsApp-Tap aus geschlossener App), liefert
    // getInitialURL() die URL nach.
    Linking.getInitialURL().then((url) => {
      if (url) handle(url, bumpRefresh);
    });

    // Live-Listener: App läuft schon, User wechselt zurück über einen Link.
    const sub = Linking.addEventListener("url", ({ url }) => {
      handle(url, bumpRefresh);
    });
    return () => sub.remove();
    // bumpRefresh ist via useCallback stabil — kein Deps-Loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function handle(rawUrl: string, onImported: () => void) {
  let parsed: ReturnType<typeof Linking.parse>;
  try {
    parsed = Linking.parse(rawUrl);
  } catch {
    return; // unbekanntes Format → ignorieren
  }
  if (parsed.hostname !== IMPORT_PATH && parsed.path !== IMPORT_PATH) return;

  const data = parsed.queryParams?.data;
  if (typeof data !== "string" || data.length === 0) {
    Alert.alert("Ungültiger Link", "Im Rezept-Link fehlen die Daten.");
    return;
  }

  let envelopeJson: string;
  try {
    envelopeJson = decodeURIComponent(data);
  } catch {
    Alert.alert(
      "Link beschädigt",
      "Die Rezeptdaten im Link konnten nicht gelesen werden.",
    );
    return;
  }

  // Hübschen Bestätigungs-Dialog mit Titel-Vorschau zeigen.
  let title = "ein Rezept";
  try {
    const env = JSON.parse(envelopeJson);
    if (env?.recipe?.title) title = `„${env.recipe.title}"`;
  } catch {
    Alert.alert(
      "Link ungültig",
      "Die Rezeptdaten passen nicht zu Food_Tempel.",
    );
    return;
  }

  Alert.alert(
    "Rezept importieren?",
    `Möchtest du ${title} zu deinen Rezepten hinzufügen?`,
    [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Importieren",
        onPress: async () => {
          try {
            await importRecipeFromJson(envelopeJson);
            onImported();
            Alert.alert(
              "Importiert",
              "Das Rezept liegt jetzt in deiner Liste.",
            );
          } catch (err) {
            Alert.alert(
              "Import fehlgeschlagen",
              err instanceof Error ? err.message : String(err),
            );
          }
        },
      },
    ],
  );
}
