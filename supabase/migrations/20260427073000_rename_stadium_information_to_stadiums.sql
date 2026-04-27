do $$
begin
  if to_regclass('public.stadiums') is null and to_regclass('public.stadium_information') is not null then
    alter table public.stadium_information rename to stadiums;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stadiums'
      and policyname = 'stadium_information_select_public'
  ) then
    alter policy "stadium_information_select_public"
    on public.stadiums
    rename to "stadiums_select_public";
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.stadiums'::regclass
      and tgname = 'handle_stadium_information_updated_at'
  ) then
    alter trigger handle_stadium_information_updated_at
    on public.stadiums
    rename to handle_stadiums_updated_at;
  end if;
end $$;
