// /extract/* — Routen für die KI-gestützte Rezept-Extraktion.
//
// Drei Eingangs-Quellen, ein einheitliches Output-Format (ExtractedRecipe):
//   POST /extract/photo  body: { imageBase64, mimeType? }
//   POST /extract/url    body: { url }
//   POST /extract/pdf    body: { pdfBase64 }

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { ApiResult, ExtractedRecipe } from "../types.js";
import {
  extractFromImage,
  extractFromText,
  extractTextFromPdf,
  fetchUrlAsText,
} from "../lib/extractRecipe.js";
import { requireAuth } from "../middleware/auth.js";

// zod-Schemata für die Request-Bodies
const photoSchema = z.object({
  imageBase64: z.string().min(100),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
});

const urlSchema = z.object({
  url: z.string().url(),
});

const pdfSchema = z.object({
  pdfBase64: z.string().min(100),
});

export async function extractRoutes(server: FastifyInstance): Promise<void> {
  server.addHook("preHandler", requireAuth);

  // ----------------------------------------------------------------------
  // POST /extract/photo
  // ----------------------------------------------------------------------
  server.post<{ Body: unknown }>("/extract/photo", async (request, reply) => {
    const parsed = photoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ ok: false, error: "Ungültige Eingabe: " + parsed.error.message });
    }

    try {
      const recipe = await extractFromImage(
        parsed.data.imageBase64,
        parsed.data.mimeType,
      );
      const result: ApiResult<ExtractedRecipe> = { ok: true, data: recipe };
      return result;
    } catch (err) {
      request.log.error(err);
      return reply.code(502).send({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Foto-Extraktion fehlgeschlagen",
      });
    }
  });

  // ----------------------------------------------------------------------
  // POST /extract/url
  // ----------------------------------------------------------------------
  server.post<{ Body: unknown }>("/extract/url", async (request, reply) => {
    const parsed = urlSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ ok: false, error: "Ungültige URL: " + parsed.error.message });
    }

    try {
      const text = await fetchUrlAsText(parsed.data.url);
      if (text.length < 100) {
        return reply
          .code(422)
          .send({ ok: false, error: "Webseite enthielt zu wenig Text." });
      }
      const recipe = await extractFromText(text);
      // sourceUrl als Komfort mitgeben
      recipe.sourceUrl = parsed.data.url;
      const result: ApiResult<ExtractedRecipe> = { ok: true, data: recipe };
      return result;
    } catch (err) {
      request.log.error(err);
      return reply.code(502).send({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "URL-Extraktion fehlgeschlagen",
      });
    }
  });

  // ----------------------------------------------------------------------
  // POST /extract/pdf
  // ----------------------------------------------------------------------
  server.post<{ Body: unknown }>("/extract/pdf", async (request, reply) => {
    const parsed = pdfSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ ok: false, error: "Ungültige Eingabe: " + parsed.error.message });
    }

    try {
      // Base64 → Uint8Array für unpdf
      const buffer = Uint8Array.from(Buffer.from(parsed.data.pdfBase64, "base64"));
      const text = await extractTextFromPdf(buffer);
      if (text.length < 50) {
        return reply
          .code(422)
          .send({ ok: false, error: "PDF enthielt zu wenig Text." });
      }
      const recipe = await extractFromText(text);
      const result: ApiResult<ExtractedRecipe> = { ok: true, data: recipe };
      return result;
    } catch (err) {
      request.log.error(err);
      return reply.code(502).send({
        ok: false,
        error:
          err instanceof Error ? err.message : "PDF-Extraktion fehlgeschlagen",
      });
    }
  });
}
