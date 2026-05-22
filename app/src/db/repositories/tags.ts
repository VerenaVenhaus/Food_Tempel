// Repository für Tags. Lesefunktionen — Filter-Menü auflisten.
// Anlegen neuer Tags ist seltener; wenn der User welche braucht, kann er
// sie über die Settings-Seite (Phase 9+) erstellen.

import { asc, eq } from "drizzle-orm";

import { getDb } from "../client";
import { type NewTag, type Tag, tags } from "../schema";
import { newId } from "../uuid";

export async function listTags(): Promise<Tag[]> {
  return getDb().select().from(tags).orderBy(asc(tags.category), asc(tags.name));
}

export async function listTagsByCategory(
  category: Tag["category"],
): Promise<Tag[]> {
  return getDb()
    .select()
    .from(tags)
    .where(eq(tags.category, category))
    .orderBy(asc(tags.name));
}

export async function createTag(input: Omit<NewTag, "id">): Promise<string> {
  const id = newId();
  await getDb().insert(tags).values({ id, ...input });
  return id;
}
