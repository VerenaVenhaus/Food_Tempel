// Client zum Aufrufen unseres eigenen Backends.
//
// Das Backend braucht den Supabase-JWT, damit es weiß, welcher User
// gerade einen Call macht. Den ziehen wir aus dem Supabase-Client der App.
//
// Konfigurierbar über EXPO_PUBLIC_API_URL in der .env-Datei.
// Falls die Variable fehlt, nehmen wir localhost — funktioniert aber
// nur, wenn das Handy via USB/ADB-Bridge mit dem PC verbunden ist.
// Für den Android-Emulator ist die PC-Adresse "10.0.2.2" statt "localhost"
// (Emulator-spezifisch).

import { Platform } from "react-native";

import { supabase } from "./supabase";

function defaultApiUrl(): string {
  // Android-Emulator: 10.0.2.2 ist die "Host-Schleife" — vom Emulator aus
  // erreichst du damit deinen lokalen PC.
  if (Platform.OS === "android") return "http://10.0.2.2:3000";
  return "http://localhost:3000";
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl();

async function getAuthHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const auth = await getAuthHeader();
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...auth,
        ...(init.headers ?? {}),
      },
    });

    const json = (await response.json()) as ApiResult<T>;
    return json;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Public API ---------------------------------------------------------------

export async function pingBackend(): Promise<ApiResult<{ service: string; timestamp: string }>> {
  return request("/health");
}

export type ExtractedRecipe = {
  title?: string;
  description?: string;
  instructions?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  cuisine?: string;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack" | "dessert";
  imageUri?: string;
  sourceUrl?: string;
  ingredients?: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
  }>;
  confidence?: number;
};

export async function extractFromPhoto(
  imageBase64: string,
  mimeType?: "image/jpeg" | "image/png" | "image/webp",
): Promise<ApiResult<ExtractedRecipe>> {
  return request("/extract/photo", {
    method: "POST",
    body: JSON.stringify({ imageBase64, mimeType }),
  });
}

export async function extractFromUrl(
  url: string,
): Promise<ApiResult<ExtractedRecipe>> {
  return request("/extract/url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function extractFromPdf(
  pdfBase64: string,
): Promise<ApiResult<ExtractedRecipe>> {
  return request("/extract/pdf", {
    method: "POST",
    body: JSON.stringify({ pdfBase64 }),
  });
}
