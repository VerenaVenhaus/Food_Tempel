# Food_Tempel

Eine Rezepte-App für Android (primär), Web und Desktop.
Lokal-first mit optionalem Cloud-Anteil für Auth, Teilen und KI-Features.

## Architektur (Überblick)

| Bereich | Technologie | Wo |
|---|---|---|
| Mobile (Android/iOS) + Web/Desktop | React Native + Expo (TypeScript) | `app/` |
| Lokale Datenbank | SQLite (via Expo SQLite + Drizzle ORM) | im Gerät |
| Authentifizierung | Supabase Auth | Cloud |
| Datei-/Bilderspeicher | Lokal + optional Supabase Storage | Cloud |
| Mini-Backend für OpenAI-Proxy | Node.js + Fastify | `backend/` |
| Geteilte TypeScript-Typen | TypeScript | `shared/` |
| Deployment Backend | Railway oder Render | Cloud |

**Lokal-first:** Rezepte werden primär auf dem Gerät in SQLite gespeichert. Die App funktioniert offline.
**Cloud nur wo nötig:** Supabase für Login/Passwort-Reset/Sync, kleines Backend für sichere OpenAI-API-Calls.

## Ordner-Struktur

```
Food_Tempel_neu/
├── app/        # React Native + Expo App (Mobile + Web)
├── backend/    # Fastify-Backend für OpenAI-Proxy (später)
├── shared/     # Geteilte Typen zwischen App und Backend
└── README.md
```

## Features (geplant)

- Login: Registrierung, Anmeldung, Passwort-Reset (Supabase Auth)
- Rezepteliste: alphabetisch, Filter-Sidebar (Desktop) / -Modal (Mobile)
- Rezeptansicht mit allen Details
- Rezepte anlegen: manuell ODER per KI-Extraktion (Foto, URL, PDF, Kamera)
- Suche: Volltext + Zutaten-basiert
- Filter: Länderküche, Diät (vegan/vegetarisch/diabetes-/arthrosegerecht), Mahlzeitentyp, Nährwerte
- Rezepte teilen

## Entwicklung starten

```bash
cd app
npx expo start
```

Mehr siehe `app/README.md`.

## Status

Alle 11 Phasen abgeschlossen (Stand: Mai 2026).

- Phase 0–4: lokale Funktionalität (Setup, DB, Navigation, Rezept-Form, Suche/Filter)
- Phase 5–6: Auth (Supabase) + Mini-Backend (Fastify)
- Phase 7: KI-Extraktion via Google Gemini (Foto/URL/PDF)
- Phase 8: Nährwerte via Open Food Facts
- Phase 9: Teilen + Cloud-Backup
- Phase 10: Polish + Build (siehe **[BUILD.md](./BUILD.md)** für die Anleitung, wie aus dem Code eine `.apk` wird)

## Lokale Entwicklung

**Backend starten:**
```
cd backend
npm install      # einmalig
npm run dev
```
Server hört auf `http://localhost:3000`.

**App starten:**
```
cd app
npm install      # einmalig
npx expo start
```
Im Terminal `a` für Android-Emulator. Vorher braucht's Android Studio + ein AVD.

**Konfiguration:**
- `app/.env` mit `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `backend/.env` mit `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`

Beide `.env`-Dateien sind in `.gitignore` und werden nicht gecheckt.

## Build (`.apk` für Android)

Siehe **[BUILD.md](./BUILD.md)**.
