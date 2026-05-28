// Suche in den BLS-Lebensmitteln — Quelle für das Zutaten-Autocomplete.
//
// Ablauf: SQL holt eine grobe Kandidatenmenge (enthält den Suchbegriff bzw.
// dessen kompakte Form), danach ranken wir in JavaScript. JS-Ranking ist hier
// lesbarer als ein verschachteltes SQL-CASE und bei nur ~7.140 Zeilen schnell.

import { BLS_STAPLE_ALIASES } from "../../data/blsStapleAliases";
import { getRawDb } from "../client";
import { compactBlsSearch, normalizeBlsSearch } from "../seedBlsFoods";

// Was das Autocomplete braucht: Anzeigename + Code (für die exakte
// Nährwert-Zuordnung beim Speichern).
export type BlsFoodSuggestion = {
  code: string;
  name: string;
};

// Was die On-Device-Nährwert-Berechnung braucht. NULL = im BLS kein Messwert
// vorhanden (NICHT mit 0 verwechseln).
export type BlsFoodNutrition = {
  code: string;
  name: string;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
};

/**
 * Versucht, einen KI-extrahierten Zutat-Namen automatisch auf einen exakten
 * BLS-Eintrag abzubilden. Liefert `null`, wenn kein hinreichend sicherer
 * Treffer gefunden wurde — dann bleibt die Zutat unkodiert und die Nährwerte
 * gehen später per Backend/OFF-Fallback (oder der User wählt selbst nach).
 *
 * Strategie (von sicher zu unsicher):
 *  1. Alias-Map: wenn ein kuratierter Schnellzugriff den Namen abdeckt
 *     (z.B. "Apfel" → F110100), übernehmen wir direkt.
 *  2. Letztes Wort: deutsche Substantive stehen oft am Ende
 *     ("frische Tomaten" → "tomaten") — auf das Wort allein nochmal prüfen.
 *  3. Volltext-Suche: nur binden, wenn der beste Treffer ein exakter Name
 *     ODER ein Treffer mit ganzem Wort ist (rank-Tier 0 oder 1). Tier 2+
 *     (nur Prefix/Substring) wird bewusst NICHT auto-gebunden — sonst
 *     würde "Apfelpektin" fälschlich zu "Apfel roh" geworfen.
 *
 * Liefert {code, name} damit der Aufrufer den BLS-Anzeigenamen ("Apfel roh")
 * statt des Roh-Inputs ("Apfel") übernehmen kann.
 */
export function reconcileBlsCode(rawName: string): BlsFoodSuggestion | null {
  const q = normalizeBlsSearch(rawName);
  if (q.length < 2) return null;

  // Letztes Wort als Fallback-Variante.
  const words = q.split(/\s+/).filter((w) => w.length >= 2);
  const lastWord = words.length > 1 ? words[words.length - 1] : null;

  // 1. Alias-Map (Vollstring + letztes Wort).
  for (const variant of lastWord ? [q, lastWord] : [q]) {
    const code = bestAliasCode(variant);
    if (code) {
      const row = getBlsFoodByCode(code);
      if (row) return { code: row.code, name: row.name };
    }
  }

  // 2. Volltext-Suche (Vollstring + letztes Wort), nur sicherer Treffer.
  for (const variant of lastWord ? [q, lastWord] : [q]) {
    const top = topBlsMatch(variant);
    if (top && top.tier <= 1) return { code: top.code, name: top.name };
  }

  return null;
}

// Kürzester Alias-Schlüssel, der mit `q` beginnt — selbe Regel wie das
// Pinning in searchBlsFoods. Spezifischster Treffer zuerst.
function bestAliasCode(q: string): string | null {
  let bestKey: string | null = null;
  for (const key of Object.keys(BLS_STAPLE_ALIASES)) {
    if (key.startsWith(q) && (!bestKey || key.length < bestKey.length)) {
      bestKey = key;
    }
  }
  return bestKey ? BLS_STAPLE_ALIASES[bestKey] : null;
}

// Bester Such-Treffer für einen Variant + sein Rang-Tier. Wendet denselben
// "Kein Gericht"-Filter an wie searchBlsFoods, damit "Tomate" nicht zu
// "Tomatensauce mit …" gebunden wird.
function topBlsMatch(
  q: string,
): { code: string; name: string; tier: number } | null {
  const qc = compactBlsSearch(q);
  const rows = getRawDb().getAllSync<Row>(
    `SELECT code, name, name_search, name_compact
       FROM bls_foods
      WHERE (name_search LIKE ? OR name_compact LIKE ?)
        AND code NOT LIKE 'D%'
        AND name_search NOT LIKE '% mit %'
        AND name_search NOT LIKE '%(mit %'
      LIMIT 200`,
    [`%${q}%`, `%${qc}%`],
  );
  if (rows.length === 0) return null;
  let best = { row: rows[0], tier: rank(q, qc, rows[0]) };
  for (let i = 1; i < rows.length; i++) {
    const tier = rank(q, qc, rows[i]);
    if (
      tier < best.tier ||
      (tier === best.tier && rows[i].name.length < best.row.name.length)
    ) {
      best = { row: rows[i], tier };
    }
  }
  return { code: best.row.code, name: best.row.name, tier: best.tier };
}

/**
 * Holt einen einzelnen BLS-Eintrag per Code für die Nährwert-Berechnung.
 * Synchron — `getFirstSync` ist nur ein indexierter Lookup auf den Primary
 * Key (`code`), das kostet praktisch nichts.
 */
export function getBlsFoodByCode(code: string): BlsFoodNutrition | null {
  return getRawDb().getFirstSync<BlsFoodNutrition>(
    `SELECT code, name, kcal, protein, carbs, fat, fiber, sugar
       FROM bls_foods WHERE code = ?`,
    [code],
  );
}

// Wie viele Treffer wir maximal zurückgeben bzw. aus SQL vorladen.
const MAX_RESULTS = 25;
const MAX_CANDIDATES = 500;

// Rohzeile, wie SQLite sie liefert (Spaltennamen = Keys).
type Row = {
  code: string;
  name: string;
  name_search: string;
  name_compact: string;
};

// Bewertet, wie gut ein Kandidat zur Suche passt. Kleinere `tier` = besserer
// Treffer. Tier 0 fasst exakte Treffer zusammen — auch wenn nur Leerzeichen
// abweichen ("haferflocken" == kompaktes "Hafer Flocken").
function rank(q: string, qc: string, row: Row): number {
  const s = row.name_search;
  const sc = row.name_compact;
  const words = s.split(/\s+/);

  if (s === q || sc === qc) return 0; // exakt (ggf. nur Leerzeichen anders)
  if (words.includes(q)) return 1; // ganzes Wort == Suche ("apfel" in "apfel roh")
  if (s.startsWith(q)) return 2; // Namensanfang ("apfelmus")
  if (sc.startsWith(qc)) return 3; // kompakter Anfang
  if (words.some((w) => w.startsWith(q))) return 4; // Wortanfang
  if (s.includes(q)) return 5; // irgendwo enthalten
  return 6; // nur kompakt enthalten (SQL-Vorfilter)
}

/**
 * Sucht passende BLS-Lebensmittel zu einem (frei getippten) Suchbegriff.
 * Gibt die besten Treffer sortiert zurück (beste zuerst). Synchron — die
 * Abfrage ist bei ~7.140 Zeilen nur wenige Millisekunden.
 */
// Findet die BLS-Codes kuratierter Staples, deren Begriff mit der Eingabe
// beginnt — z.B. "zwiebe" → "zwiebel". Bewusst nur key.startsWith(q): so heftet
// "apfel" zwar "Apfel roh" an, "apfelsaft" aber NICHT (sonst ginge die
// gewünschte Trennschärfe verloren). Kürzere Schlüssel zuerst.
function matchingAliasCodes(q: string): string[] {
  const codes: string[] = [];
  const keys = Object.keys(BLS_STAPLE_ALIASES)
    .filter((key) => key.startsWith(q))
    .sort((a, b) => a.length - b.length);
  for (const key of keys) {
    const code = BLS_STAPLE_ALIASES[key];
    if (!codes.includes(code)) codes.push(code);
  }
  return codes;
}

export function searchBlsFoods(query: string): BlsFoodSuggestion[] {
  const q = normalizeBlsSearch(query);
  if (q.length < 2) return [];
  const qc = compactBlsSearch(q);
  const db = getRawDb();

  // 1. Kuratierte Staples nach oben heften (z.B. "milch" → H-Vollmilch 3,5 %).
  const aliasCodes = matchingAliasCodes(q);
  const pinned: BlsFoodSuggestion[] = [];
  if (aliasCodes.length > 0) {
    const placeholders = aliasCodes.map(() => "?").join(",");
    const aliasRows = db.getAllSync<Row>(
      `SELECT code, name, name_search, name_compact FROM bls_foods WHERE code IN (${placeholders})`,
      aliasCodes,
    );
    // In der Reihenfolge der Alias-Codes (kürzester Schlüssel zuerst).
    for (const code of aliasCodes) {
      const row = aliasRows.find((r) => r.code === code);
      if (row) pinned.push({ code: row.code, name: row.name });
    }
  }

  // 2. Normale Rangsuche.
  //
  // Filter, damit der Picker Zutaten zeigt — nicht fertige Gerichte/Backwaren:
  //   - `code LIKE 'D%'`: BLS-Gruppe Backwaren-Rezepturen ("(Rührmasse)",
  //     "(Mürbeteig)", "Apfel-Mohntorte" usw.) — sind keine Zutaten.
  //   - `name_search LIKE '% mit %'`: Zutaten-Namen heißen "Apfelmus" oder
  //     "Tomatensauce italienische Art"; Gerichte heißen "Grießauflauf MIT
  //     Apfel" / "Apfelmus MIT Zimt" / "Bratkartoffeln MIT Ei". Der
  //     "mit"-Marker fängt Gerichte zuverlässig ab, ohne Basis-Zubereitungen
  //     wie "Tomate gekocht" oder "Schlagsahne mind. 30 % Fett" zu verlieren.
  // Alias-Treffer (oben) gehen am Filter vorbei — sie werden per Code geholt.
  const rows = db.getAllSync<Row>(
    `SELECT code, name, name_search, name_compact
       FROM bls_foods
      WHERE (name_search LIKE ? OR name_compact LIKE ?)
        AND code NOT LIKE 'D%'
        AND name_search NOT LIKE '% mit %'
        AND name_search NOT LIKE '%(mit %'
      LIMIT ?`,
    [`%${q}%`, `%${qc}%`, MAX_CANDIDATES],
  );

  const ranked = rows
    .map((row) => ({ row, tier: rank(q, qc, row) }))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      // Innerhalb eines Tiers: kürzerer Name zuerst — Grundformen ("Apfel roh")
      // sind kürzer als zusammengesetzte Gerichte ("Apfelmus mit Sahne").
      if (a.row.name.length !== b.row.name.length) {
        return a.row.name.length - b.row.name.length;
      }
      return a.row.name.localeCompare(b.row.name, "de");
    })
    .map(({ row }) => ({ code: row.code, name: row.name }));

  // 3. Angeheftete zuerst, Rest ohne Dubletten.
  const pinnedCodes = new Set(pinned.map((p) => p.code));
  const rest = ranked.filter((r) => !pinnedCodes.has(r.code));
  return [...pinned, ...rest].slice(0, MAX_RESULTS);
}
