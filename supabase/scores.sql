-- Ejecutar en Supabase Dashboard > SQL Editor > New query

alter table public.scores
  add column if not exists score integer not null default 0,
  add column if not exists red_apples integer not null default 0,
  add column if not exists golden_apples integer not null default 0,
  add column if not exists green_apples integer not null default 0;

alter table public.scores
  drop constraint if exists scores_score_check,
  drop constraint if exists scores_red_apples_check,
  drop constraint if exists scores_golden_apples_check,
  drop constraint if exists scores_green_apples_check;

alter table public.scores
  add constraint scores_score_check check (score between 0 and 50),
  add constraint scores_red_apples_check check (red_apples between 0 and 50),
  add constraint scores_golden_apples_check check (golden_apples >= 0),
  add constraint scores_green_apples_check check (green_apples >= 0);

create unique index if not exists scores_username_key
  on public.scores (username);

alter table public.scores enable row level security;

drop policy if exists "Anyone can read scores" on public.scores;
create policy "Anyone can read scores"
  on public.scores for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can submit scores" on public.scores;
create policy "Anyone can submit scores"
  on public.scores for insert
  to anon, authenticated
  with check (true);
