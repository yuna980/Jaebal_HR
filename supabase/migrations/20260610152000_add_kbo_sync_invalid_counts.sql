alter table public.kbo_sync_runs
  add column if not exists total_invalid integer not null default 0,
  add column if not exists invalid_samples jsonb not null default '[]'::jsonb;
