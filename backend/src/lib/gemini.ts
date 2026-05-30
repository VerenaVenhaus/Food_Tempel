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

// Gemini 2.5 Flash Lite — Vision-fähig, Free Tier (15 RPM, 1000 RPD),
// etwas weniger akkurat als 2.5-flash, dafür großzügigere Limits.
//
// Historie der Modellwechsel:
//   - gemini-2.0-flash:    2025 aus dem Free Tier rausgefallen
//   - gemini-1.5-flash:    Anfang 2026 abgeschaltet
//   - gemini-2.5-flash:    Mai 2026 vom Backend aus (Frankfurt-Region)
//                          mit "User location is not supported" abgewiesen
//                          → Wechsel auf -lite. Falls auch -lite die EU-
//                          Sperre triggert, ist die einzige saubere Lösung
//                          ein Render-Service in einer US-Region (Plan B).
export const MODEL = "gemini-2.5-flash-lite";
