// Supabase-Client für die App.
//
// Setup-Schritte:
// 1. Auf supabase.com ein kostenloses Projekt anlegen
// 2. In Project Settings → API: Project URL und anon-public Key kopieren
// 3. In app/.env eintragen:
//    EXPO_PUBLIC_SUPABASE_URL=https://...
//    EXPO_PUBLIC_SUPABASE_ANON_KEY=ey...
// 4. Dev-Server mit `npx expo start --clear` neu starten
//    (Expo liest die .env nur beim Start ein)
//
// Wenn die Keys fehlen, geben wir hier null zurück und die App zeigt eine
// Setup-Hinweis-Seite statt zu crashen.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// URL-Polyfill ist nötig, weil React Native eine unvollständige URL-API hat
// und @supabase/supabase-js darauf angewiesen ist.
import "react-native-url-polyfill/auto";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(url && anonKey && url.startsWith("https://"));

// Wenn die Konfiguration fehlt, exportieren wir null. UI-Code muss vor jeder
// Verwendung mit `isSupabaseConfigured` checken.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        // Session in AsyncStorage persistieren — überlebt App-Neustarts
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // detectSessionInUrl: in Mobile-Apps gibt's keine URL-Sessions
        detectSessionInUrl: false,
      },
    })
  : null;
