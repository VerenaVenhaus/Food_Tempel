# Build-Anleitung — Food_Tempel

Wie aus dem Code eine `.apk`-Datei zum Installieren wird.

Wir nutzen **EAS Build** (Expo's Cloud-Service). Der Build läuft auf Expos Servern, nicht auf deinem PC — du brauchst kein Android Studio mehr für den finalen Build, nur ein Expo-Konto.

> **Wichtig:** Die Free-Tier-Limits von Expo sind locker (mehrere Builds pro Monat); für ein Hobby-Projekt langt das problemlos.

---

## Vor dem ersten Build (einmalig)

### 1. EAS CLI installieren

In PowerShell (egal wo):
```
npm install -g eas-cli
```

Test:
```
eas --version
```

### 2. Bei Expo einloggen / Konto anlegen

```
eas login
```

Es öffnet sich der Browser. Mit GitHub einloggen oder neu registrieren (kostenlos, keine Kreditkarte).

### 3. Projekt initialisieren

Im `app/`-Ordner:
```
cd "C:\Users\venhaus\Schule, Udemy\Food_Tempel_neu\app"
eas init
```

EAS legt das Projekt in deiner Expo-Cloud an und schreibt eine **`projectId`** in `app.json`. **Diese Änderung committen** (`git add app/app.json && git commit -m "EAS project init"`).

### 4. Environment-Variablen in der Cloud setzen

Die App braucht beim Build die `EXPO_PUBLIC_*`-Variablen aus `.env`. Da die `.env` nicht in Git landet, müssen wir die Werte einmal als **EAS Secrets** hochladen:

```
eas env:create --scope project --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "https://DEIN-PROJEKT.supabase.co" --visibility plaintext

eas env:create --scope project --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGc...dein-key" --visibility plaintext

eas env:create --scope project --environment preview --name EXPO_PUBLIC_API_URL --value "https://DEINE-BACKEND-URL" --visibility plaintext
```

Den letzten Wert kannst du erst setzen, wenn du das Backend deployed hast — siehe „Backend deployen" weiter unten. Für einen ersten **Test-Build ohne KI-Features** kannst du den weglassen.

Für `production` analog (in der Cloud trennt sich dev/preview/production-Env, damit du z.B. ein Staging-Supabase haben kannst):
```
eas env:create --scope project --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "..." --visibility plaintext
# usw.
```

---

## Build auslösen

### Preview-Build → installierbare `.apk`

Für „kann ich auf mein eigenes Handy laden":
```
cd app
eas build --profile preview --platform android
```

Dauert **10–20 Minuten** auf Expos Servern. Am Ende kriegst du einen Link wie:
```
https://expo.dev/artifacts/eas/abc123.apk
```

→ Auf dem Handy aufrufen → Download → Installieren (Android fragt nach „Aus unbekannter Quelle installieren" — erlauben).

### Production-Build → `.aab` für Play Store

Erst wenn du die App im Google Play Store veröffentlichen willst:
```
eas build --profile production --platform android
```

Liefert eine `.aab`-Datei. Diese lädst du dann in der Google Play Console hoch (separates Thema — Konto-Erstellung dort kostet einmalig $25).

---

## Backend deployen (für KI-Features im Production-Build)

Während der Entwicklung läuft das Backend auf `localhost:3000`. Für einen echten Build braucht es eine öffentliche URL.

### Variante: Railway (kostenloser Free Tier, einfach)

1. Auf **https://railway.app** mit GitHub einloggen
2. „New Project" → „Deploy from GitHub Repo" → dein `Food_Tempel`-Repo wählen
3. Im neuen Projekt: „+ New" → „Folder" → `backend` wählen
4. Environment Variables setzen (kopiere aus `backend/.env`):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `ALLOWED_ORIGINS=*`
5. Railway weist eine Domain zu (etwa `food-tempel-production.up.railway.app`)
6. Diese URL als `EXPO_PUBLIC_API_URL` in EAS-Env setzen (siehe oben)

### Variante: Render

Ähnlich wie Railway. **https://render.com** → „New Web Service" → GitHub-Repo → `backend` als Root-Verzeichnis → Build-Command `npm install && npm run build` → Start-Command `npm start`.

---

## Häufige Probleme

| Problem | Lösung |
|---|---|
| `eas: command not found` | `npm install -g eas-cli` (Schritt 1) |
| Build schlägt fehl mit „Missing icon" | Die PNG-Icons unter `app/assets/` müssen existieren (siehe `scripts/convert-icons.mjs`) |
| App startet, zeigt aber „Setup nötig" | EAS-Env-Variablen für SUPABASE_URL + ANON_KEY fehlen |
| Build dauert ewig | Free Tier Queue — bei viel Andrang 30+ Min Wartezeit. Premium ist schneller, kostet aber. |
