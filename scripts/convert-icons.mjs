// Konvertiert app/assets/koala.jpg → die für den Build nötigen PNG-Icons.
//
// Ausgaben (alle 1024×1024, weißer Background):
//   app/assets/icon.png            — Launcher-Icon, leichter Rand (~5%)
//   app/assets/adaptive-icon.png   — Android Adaptive Icon, mehr Rand (~20%, Safe-Zone)
//   app/assets/splash-icon.png     — Splash-Screen-Logo
//
// Einmalig ausführen:
//   cd scripts && npm install && npm run icons

import { Jimp } from "jimp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, "..", "app", "assets");
const SRC = join(ASSETS, "koala.jpg");

const SIZE = 1024;
// Unser Theme-Background-Off-White (#FBFAF7) als RGBA-Hex für jimp
const BG_HEX = 0xfbfaf7ff;

async function makeIcon(destFilename, paddingPx) {
  // Leere Leinwand in der Hintergrundfarbe
  const canvas = new Jimp({ width: SIZE, height: SIZE, color: BG_HEX });

  // Original-Bild laden + auf inneren Bereich skalieren
  const inner = SIZE - 2 * paddingPx;
  const koala = await Jimp.read(SRC);
  koala.resize({ w: inner, h: inner });

  // Zentriert einsetzen
  canvas.composite(koala, paddingPx, paddingPx);

  const dest = join(ASSETS, destFilename);
  await canvas.write(dest);
  console.log(`✓ ${dest} (${SIZE}×${SIZE}, Padding ${paddingPx}px)`);
}

console.log(`Lese Quelle: ${SRC}\n`);

// Standard-App-Icon: minimaler Rand
await makeIcon("icon.png", 50);

// Adaptive Icon: mehr Rand, weil Android-Launcher das Bild beschneiden
// (mal rund, mal eckig, mal "squircle") — die "Safe Zone" muss reichen.
await makeIcon("adaptive-icon.png", 200);

// Splash-Icon: mittlerer Rand, weil hier eher Logo-haft präsentiert
await makeIcon("splash-icon.png", 150);

console.log("\nFertig. Icons sind unter app/assets/ bereit.");
