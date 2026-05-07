-- Ejecutar en Supabase SQL Editor para guardar la oración elegida
-- junto con cada capitalario.

alter table public.capitalarios
  add column if not exists "oracionId" uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'capitalarios_oracionId_fkey'
  ) then
    alter table public.capitalarios
      add constraint capitalarios_oracionId_fkey
      foreign key ("oracionId") references public.oraciones(id)
      on delete set null;
  end if;
end $$;

create index if not exists capitalarios_oracionId_idx
  on public.capitalarios ("oracionId");
