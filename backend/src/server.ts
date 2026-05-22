// Einstiegspunkt des Backends.
//
// Startet einen Fastify-Server, registriert CORS, Routen und Error-Handler.
// Lokal lauscht er auf PORT=3000, in Production setzt Railway/Render PORT
// als Environment Variable.

import "dotenv/config"; // Lädt backend/.env beim Start

import cors from "@fastify/cors";
import Fastify from "fastify";

import { extractRoutes } from "./routes/extract.js";
import { healthRoutes } from "./routes/health.js";
import { nutritionRoutes } from "./routes/nutrition.js";

const server = Fastify({
  // Logger an, damit wir Requests im Terminal sehen
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
  },
  // Body-Limit hochsetzen — Bilder/PDFs als Base64 können groß werden
  bodyLimit: 20 * 1024 * 1024, // 20 MB
});

async function start() {
  // CORS: aus welchen Quellen darf das Backend angesprochen werden?
  // In Dev "*" (alle), in Production die App-Domain.
  const allowedOrigins = process.env.ALLOWED_ORIGINS ?? "*";
  await server.register(cors, {
    origin: allowedOrigins === "*" ? true : allowedOrigins.split(","),
    credentials: true,
  });

  // Routen registrieren
  await server.register(healthRoutes);
  await server.register(extractRoutes);
  await server.register(nutritionRoutes);

  // Globaler Error-Handler — falls irgendwo was wirft, formatieren wir
  // das einheitlich.
  server.setErrorHandler((err: Error, _request, reply) => {
    server.log.error(err);
    reply.code(500).send({ ok: false, error: err.message ?? "Internal Server Error" });
  });

  const port = Number(process.env.PORT ?? 3000);
  // host="0.0.0.0" → erreichbar von außen (für Docker / Railway / Render).
  // "localhost" würde nur lokal funktionieren.
  await server.listen({ port, host: "0.0.0.0" });
  server.log.info(`Food_Tempel-Backend läuft auf Port ${port}`);
}

start().catch((err) => {
  server.log.error(err);
  process.exit(1);
});
