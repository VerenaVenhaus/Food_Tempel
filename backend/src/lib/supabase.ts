// Supabase-Client für die SERVER-Seite.
//
// Anders als im Frontend nutzen wir hier den service_role-Key. Dieser hat
// vollen DB-Zugriff und darf NIE im Mobile-App-Bundle landen. Im Backend
// ist das aber sicher, weil der Code nur auf unserem Server läuft.
//
// Wir laden den Client lazy: der Server kann auch ohne Supabase-Config
// starten (Health-Endpoint funktioniert dann), nur die Auth-geschützten
// Routes geben einen klaren Fehler aus.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase ist nicht konfiguriert. Trage SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in backend/.env ein.",
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cached;
}
