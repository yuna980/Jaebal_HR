do $$
begin
  if to_regclass('public.game_histories') is null and to_regclass('public.games') is not null then
    alter table public.games rename to game_histories;
  end if;
end $$;

alter table public.game_histories enable row level security;

drop policy if exists "games_select_public" on public.game_histories;
drop policy if exists "game_histories_select_public" on public.game_histories;
create policy "game_histories_select_public"
on public.game_histories
for select
to anon, authenticated
using (true);

drop trigger if exists handle_games_updated_at on public.game_histories;
drop trigger if exists handle_game_histories_updated_at on public.game_histories;
create trigger handle_game_histories_updated_at
before update on public.game_histories
for each row execute procedure extensions.moddatetime(updated_at);
