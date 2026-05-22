// Auth-Middleware für Fastify.
//
// Erwartet einen Header "Authorization: Bearer <jwt>" und validiert das Token
// gegen Supabase. Wenn OK, packen wir den User aufs Request-Objekt.
// Wenn nicht: 401 Unauthorized.
//
// In Fastify ist das ein "preHandler", den wir auf Routen anhängen können:
//   server.get("/foo", { preHandler: requireAuth }, async (req) => { ... });

import type { FastifyReply, FastifyRequest } from "fastify";

import { getSupabase } from "../lib/supabase.js";

// Fastify lässt sich erweitern: zusätzliche Properties am Request-Objekt
// müssen typisiert werden, damit TS sie kennt.
declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string; email?: string };
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return reply
      .code(401)
      .send({ ok: false, error: "Missing or invalid Authorization header" });
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return reply.code(401).send({ ok: false, error: "Empty token" });
  }

  // supabase.auth.getUser(jwt) validiert das Token serverseitig
  // (Signatur-Check + Expiry).
  try {
    const sb = getSupabase();
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) {
      return reply
        .code(401)
        .send({ ok: false, error: "Invalid or expired token" });
    }
    request.user = { id: data.user.id, email: data.user.email };
    return;
  } catch (err) {
    // Supabase nicht konfiguriert → 500 mit klarer Meldung
    return reply.code(500).send({
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Supabase ist auf dem Server nicht konfiguriert.",
    });
  }
}
