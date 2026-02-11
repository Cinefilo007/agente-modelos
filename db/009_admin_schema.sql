-- Tabla para Administradores
create table admins (
  telegram_id bigint primary key,
  role text not null check (role in ('owner', 'moderator', 'support')),
  permissions jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Insertar el Admin Principal (Owner)
insert into admins (telegram_id, role, permissions)
values (1123020118, 'owner', '{"all": true}'::jsonb)
on conflict (telegram_id) do update 
set role = 'owner', permissions = '{"all": true}'::jsonb;

-- RLS para Admins (Nadie puede leer esta tabla desde el cliente, solo Service Role)
alter table admins enable row level security;

create policy "Service Role can do everything"
  on admins
  using (true)
  with check (true);
