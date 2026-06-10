create table if not exists public.server_error_logs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  source text not null default 'next_api',
  route text not null,
  method text,
  status_code integer,
  error_name text not null,
  error_message text not null,
  error_stack text,
  user_id uuid references auth.users(id) on delete set null,
  request_path text,
  query jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists server_error_logs_created_at_idx
on public.server_error_logs (created_at desc);

create index if not exists server_error_logs_route_created_at_idx
on public.server_error_logs (route, created_at desc);

create index if not exists server_error_logs_status_created_at_idx
on public.server_error_logs (status_code, created_at desc);

alter table public.server_error_logs enable row level security;
