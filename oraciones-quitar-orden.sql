-- Si la tabla ya tiene la columna orden y quieres alinearla con el sitio actual,
-- ejecuta en Supabase → SQL Editor.

alter table public.oraciones drop column if exists orden;

drop index if exists public.oraciones_orden_nombre_idx;
drop index if exists public.oraciones_orden_titulo_idx;

create index if not exists oraciones_nombre_idx
  on public.oraciones (nombre asc);
