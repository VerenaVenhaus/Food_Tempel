// Google Gemini API-Client (lazy).
// Kostenloser Free Tier: 1500 Requests/Tag, Vision-fähig.
// API-Key aus https://aistudio.google.com/app/apikey.

import { GoogleGenAI } from "@google/genai";

let cached: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (cached) return cached;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY fehlt. Hol dir einen kostenlosen Key auf https://aistudio.google.com/app/apikey und trag ihn in backend/.env ein.",
    );
  }

  cached = new GoogleGenAI({ apiKey });
  return cached;
}

// Gemini 2.5 Flash — Vision-fähig, aktuell im Free Tier (10 RPM, 250 RPD).
// Historie der Modellwechsel:
//   - gemini-2.0-flash: ist 2025 aus dem Free Tier rausgefallen
//   - gemini-1.5-flash: Anfang 2026 abgeschaltet
// Falls 2.5-flash mal eng wird, kann man auf "gemini-2.5-flash-lite" wechseln —
// hat großzügigere Limits (15 RPM, 1000 RPD), etwas weniger akkurat.
export const MODEL = "gemini-2.5-flash";
