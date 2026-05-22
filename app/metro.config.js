// Metro-Bundler-Konfiguration.
// Setzt die HTTP-Header, die expo-sqlite im Browser braucht
// (Cross-Origin-Isolation für SharedArrayBuffer).
// Native-Plattformen (Android, iOS) sind davon nicht betroffen.

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Diagnose: wenn diese Zeile beim Server-Start NICHT erscheint, wird die
// metro.config.js nicht geladen. Server unbedingt mit `npx expo start --clear`
// neu starten, sonst greift die Datei nicht.
console.log("[Food_Tempel] metro.config.js geladen — CORS-Header aktiv");

config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    return middleware(req, res, next);
  };
};

module.exports = config;
