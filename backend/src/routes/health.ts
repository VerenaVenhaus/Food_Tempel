// Health-Check-Endpoint.
// Wird von Monitoring (Railway/Render) verwendet, um zu prüfen, ob der
// Server "lebt". Antwortet einfach mit 200 OK.

import type { FastifyInstance } from "fastify";

export async function healthRoutes(server: FastifyInstance): Promise<void> {
  server.get("/health", async () => ({
    ok: true,
    service: "food-tempel-backend",
    timestamp: new Date().toISOString(),
  }));
}
