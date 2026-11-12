-- Τρέξε το στο Supabase: SQL Editor (μετά το movies.sql).

create table if not exists public.watchlist (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  movie_id integer not null references public.movies (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

alter table public.watchlist enable row level security;

drop policy if exists "users read own watchlist" on public.watchlist;
create policy "users read own watchlist" on public.watchlist
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "users add to own watchlist" on public.watchlist;
create policy "users add to own watchlist" on public.watchlist
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "users remove from own watchlist" on public.watchlist;
create policy "users remove from own watchlist" on public.watchlist
  for delete to authenticated using (auth.uid() = user_id);
