-- Tabla para Reportes de Posts
create table reported_posts (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  reporter_id bigint not null, -- Telegram ID del usuario que reporta
  reporter_role text not null, -- 'client' o 'model'
  reason text not null, -- Motivo seleccionado de la lista
  description text, -- Descripción opcional
  status text default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'ignored')),
  created_at timestamp with time zone default now()
);

-- Habilitar RLS en reported_posts
alter table reported_posts enable row level security;

-- Política: Cualquiera autenticado puede crear un reporte
create policy "Authenticated users can create reports"
  on reported_posts
  for insert
  to authenticated
  with check (true);

-- Política: Solo admins pueden leer reportes (Service Role ya tiene acceso total, pero por si acaso definimos para roles futuros)
-- No se necesita policy de lectura publica, es privado.

-- Agregar campo last_seen a la tabla models para el indicador online
alter table models 
add column if not exists last_seen timestamp with time zone default now();

-- Agregar índices para consultas rápidas
create index if not exists idx_reported_posts_status on reported_posts(status);
create index if not exists idx_models_last_seen on models(last_seen);
