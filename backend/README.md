# Food_Tempel Backend

Fastify-basiertes Mini-Backend.
Einziger Zweck: OpenAI-API-Calls (Foto-, URL-, PDF-Extraktion) serverseitig ausführen,
damit der OpenAI-API-Key nicht im Client-Bundle landet.

## Setup

1. **Konfiguration:** In `.env` deine Werte eintragen:
   - `SUPABASE_URL` (gleich wie in der App)
   - `SUPABASE_SERVICE_ROLE_KEY` (NICHT der anon-Key — der service_role-Key
     ist geheim und liefert vollen DB-Zugriff)
   - `GEMINI_API_KEY` (Phase 7 — kostenlos auf https://aistudio.google.com/app/apikey)

2. **Pakete installieren:**
   ```
   cd backend
   npm install
   ```

3. **Lokal starten:**
   ```
   npm run dev
   ```
   Server läuft dann auf `http://localhost:3000`.

4. **Testen:**
   ```
   curl http://localhost:3000/health
   ```
   Erwartete Antwort: `{ "ok": true, "service": "food-tempel-backend", "timestamp": "..." }`

## Endpoints

- `GET /health` — public, für Monitoring
- `POST /extract/photo` — geschützt; erwartet `{ imageBase64, mimeType? }`
- `POST /extract/url` — geschützt; erwartet `{ url }`
- `POST /extract/pdf` — geschützt; erwartet `{ pdfBase64 }`

Geschützte Endpoints brauchen einen Header
`Authorization: Bearer <supabase-jwt>`.

## Deployment (Phase 6 später)

Geplant: Railway oder Render. Beide bieten Auto-Deploy aus dem Repo + setzen
`PORT` automatisch.
