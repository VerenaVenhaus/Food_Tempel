// Wrapper für UUID-Generierung.
// expo-crypto liefert kryptographisch sichere zufällige UUIDs (RFC 4122 v4).
// Wir haben das in eine eigene Datei gezogen, damit wir in Tests oder beim
// Server-Sync die ID-Generierung leicht austauschen können.
import * as Crypto from "expo-crypto";

export function newId(): string {
  return Crypto.randomUUID();
}
