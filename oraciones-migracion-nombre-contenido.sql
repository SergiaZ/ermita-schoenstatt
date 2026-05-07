-- Si la tabla ya existe con columnas titulo / cuerpo, ejecuta esto en SQL Editor
-- para alinearla con el frontend (nombre / contenido).

alter table public.oraciones rename column titulo to nombre;
alter table public.oraciones rename column cuerpo to contenido;

drop index if exists public.oraciones_orden_titulo_idx;
drop index if exists public.oraciones_orden_nombre_idx;

create index if not exists oraciones_nombre_idx
  on public.oraciones (nombre asc);
