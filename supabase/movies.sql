-- Τρέξε το στο Supabase: SQL Editor.

create table if not exists public.movies (
  id integer primary key,
  title text not null,
  original_title text,
  overview text,
  tagline text,
  poster_path text,
  poster_stored boolean not null default false, -- true όταν το poster υπάρχει στο Storage (bucket posters)
  backdrop_path text,
  release_date date,
  runtime integer,
  genres jsonb not null default '[]'::jsonb,
  vote_average numeric,
  vote_count integer,
  original_language text,
  details jsonb not null default '{}'::jsonb, -- πλήρης απάντηση TMDB (credits, videos, release_dates)
  in_theaters boolean not null default true,
  left_theaters_at timestamptz,
  last_seen_in_theaters_at timestamptz not null default now(),
  synced_at timestamptz not null default now()
);

-- Για πίνακα που υπάρχει ήδη:
alter table public.movies add column if not exists poster_stored boolean not null default false;

create index if not exists movies_in_theaters_idx on public.movies (in_theaters, release_date desc);

-- Διάβασμα από όλους, εγγραφή μόνο από το service role (Edge Function).
alter table public.movies enable row level security;

drop policy if exists "movies readable by everyone" on public.movies;
create policy "movies readable by everyone" on public.movies
  for select using (true);
-- Ο συγχρονισμός γίνεται από το PC με: npm run sync-movies (service role key, παρακάμπτει το RLS).
