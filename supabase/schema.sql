-- Τρέξε το στο Supabase: SQL Editor (μετά το movies.sql). Απαιτεί σύνδεση με Google: Authentication > Sign In / Providers > Google.

create table if not exists public.ratings (
  movie_id integer not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (movie_id, user_id)
);

alter table public.ratings enable row level security;

create policy "ratings readable by everyone" on public.ratings
  for select using (true);

create policy "users insert own rating" on public.ratings
  for insert to authenticated with check (auth.uid() = user_id);

create policy "users update own rating" on public.ratings
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace view public.movie_rating_summary as
  select movie_id, round(avg(rating)::numeric, 1) as average, count(*) as count
  from public.ratings
  group by movie_id;

grant select on public.movie_rating_summary to anon, authenticated;
