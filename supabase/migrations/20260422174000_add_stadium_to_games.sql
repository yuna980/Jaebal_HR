alter table public.games
add column if not exists stadium text not null default '';
