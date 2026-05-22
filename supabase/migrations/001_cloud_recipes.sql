-- Cloud-Backup-Tabelle für Food_Tempel.
-- Jeder User kann seine Rezepte hier sichern; durch Row-Level-Security
-- sieht jeder nur die eigenen.
--
-- Ausführen im Supabase-Dashboard:
--   1. Projekt öffnen → links "SQL Editor" → "New query"
--   2. Diesen ganzen Inhalt einfügen
--   3. Knopf "Run" klicken

create table if not exists cloud_recipes (
  -- Wir nehmen die LOKALE Rezept-ID — so vermeidet ein Sync Duplikate.
  id uuid primary key,
  -- Bindet das Rezept an den Eigentümer; on delete cascade,
  -- damit Lösch-Vorgänge beim User-Konto sauber laufen.
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Title doppelt gespeichert (auch in recipe_data) — für SQL-Suche/Sortierung.
  title text not null,
  -- Das komplette Rezept als JSON-Blob (RecipeShareEnvelope-Format der App).
  recipe_data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Index für schnelle Listen-Abfrage je User
create index if not exists cloud_recipes_user_idx
  on cloud_recipes (user_id, updated_at desc);

-- Row Level Security aktivieren — ohne Policies ist die Tabelle dann
-- standardmäßig komplett gesperrt, was wir nicht wollen.
alter table cloud_recipes enable row level security;

-- Policies: jeder eingeloggte User darf SEINE eigenen Reihen lesen/schreiben.
create policy "Users can view their own recipes"
  on cloud_recipes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own recipes"
  on cloud_recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own recipes"
  on cloud_recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own recipes"
  on cloud_recipes for delete
  using (auth.uid() = user_id);
