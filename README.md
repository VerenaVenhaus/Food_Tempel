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

Phase 0: Setup läuft.
