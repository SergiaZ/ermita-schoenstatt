-- Ejecutar en Supabase → SQL Editor (una sola vez).
-- Crea la tabla de oraciones y políticas para la clave anónima del frontend.

create table if not exists public.oraciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  contenido text not null,
  created_at timestamptz not null default now()
);

create index if not exists oraciones_nombre_idx
  on public.oraciones (nombre asc);

alter table public.oraciones enable row level security;

-- Lectura pública (Ermita y resumen).
drop policy if exists "oraciones_select_anon" on public.oraciones;
create policy "oraciones_select_anon"
  on public.oraciones for select
  using (true);

-- Alta / baja / edición desde las páginas del sitio con la clave anónima.
-- Si prefieres restringir esto, cámbialo en el panel y usa solo inserción con otra política.
drop policy if exists "oraciones_insert_anon" on public.oraciones;
create policy "oraciones_insert_anon"
  on public.oraciones for insert
  with check (true);

drop policy if exists "oraciones_update_anon" on public.oraciones;
create policy "oraciones_update_anon"
  on public.oraciones for update
  using (true)
  with check (true);

drop policy if exists "oraciones_delete_anon" on public.oraciones;
create policy "oraciones_delete_anon"
  on public.oraciones for delete
  using (true);

-- Datos iniciales (opcional). Omite este bloque si ya tienes filas o si los insertas desde la web.
insert into public.oraciones (nombre, contenido)
select v.nombre, v.contenido
from (values
  (
    'Oración de confianza (P. Kentenich)',
    $$Mi Dios, creo en Ti y en tu eterno amor.
Confío en que estás guiando mi vida y la historia entera.
Te entrego lo que soy y lo que debo hacer hoy.

Madre y Educadora, yo quiero ser instrumento de tu amor.
Amén.$$
  ),
  (
    'Consagración a la Virgen',
    $$Virgen María, Madre de Dios y Madre nuestra:
te consagro mi vida, mis pensamientos, obras y sufrimientos.
Forma en mí un corazón semejante al de tu Hijo Jesús.
Que todo lo que haga sirva para glorificar al Padre.
Amén.$$
  ),
  (
    'Padre Nuestro',
    $$Padre nuestro que estás en el cielo,
santificado sea tu Nombre;
venga a nosotros tu Reino;
hágase tu voluntad en la tierra como en el cielo.

Danos hoy nuestro pan de cada día;
perdona nuestras ofensas,
como también nosotros perdonamos a los que nos ofenden;
no nos dejes caer en la tentación,
y líbranos del mal.

Amén.$$
  ),
  (
    'Ave María',
    $$Dios te salve, María, llena eres de gracia,
el Señor es contigo.
Bendita tú eres entre todas las mujeres,
y bendito es el fruto de tu vientre, Jesús.

Santa María, Madre de Dios,
ruega por nosotros pecadores,
ahora y en la hora de nuestra muerte.

Amén.$$
  ),
  (
    'Gloria al Padre',
    $$Gloria al Padre, y al Hijo, y al Espíritu Santo.
Como era en el principio, ahora y siempre,
por los siglos de los siglos.

Amén.$$
  ),
  (
    'Oración a San Miguel Arcángel',
    $$San Miguel Arcángel,
defiéndonos en la lucha.
Sé nuestro amparo contra la perversidad y asechanzas del demonio.
Reprímalo Dios, pedimos suplicantes,
y tú, Príncipe de la milicia celestial,
arroja al infierno con el divino poder a Satanás
y a los otros espíritus malignos que vagan por el mundo
para la perdición de las almas.

Amén.$$
  )
) as v(nombre, contenido)
where not exists (select 1 from public.oraciones limit 1);
