-- Ejecutar en Supabase Dashboard > SQL Editor > New query.
-- La tabla scores ya debe existir con total_score, red_score,
-- green_score y golden_score.

-- La tabla permite varias partidas con el mismo username.
-- El username no debe ser único: cada partida crea un nuevo registro.
do $$
declare
  constraint_name text;
  index_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any(c.conkey)
    where c.conrelid = 'public.scores'::regclass
      and c.contype = 'u'
      and a.attname = 'username'
  loop
    execute format('alter table public.scores drop constraint %I', constraint_name);
  end loop;

  for index_name in
    select indexrelid::regclass::text
    from pg_index
    where indrelid = 'public.scores'::regclass
      and indisunique
      and not indisprimary
      and indexrelid::regclass::text like 'public.%'
        and pg_get_indexdef(indexrelid) ilike '%username%'
  loop
    execute format('drop index if exists %s', index_name);
  end loop;
end $$;

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

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'scores'
  and indexdef ilike '%username%'
  and indexdef ilike '%unique%';
