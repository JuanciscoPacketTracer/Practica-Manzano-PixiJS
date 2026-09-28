-- Ejecutar en Supabase Dashboard > SQL Editor > New query.
-- La tabla scores ya debe existir con total_score, red_score,
-- green_score y golden_score.

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

-- Recarga el esquema que usa la API REST de Supabase.
notify pgrst, 'reload schema';

-- Verificación opcional: debe devolver las columnas del leaderboard.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'scores'
order by ordinal_position;
