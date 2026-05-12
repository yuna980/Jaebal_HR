alter table public.profiles
  add column if not exists email text;

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or coalesce(new.is_anonymous, false) then
    return new;
  end if;

  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_profile();

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute function public.handle_auth_user_profile();

insert into public.profiles (id, email)
select id, email
from auth.users
where email is not null
  and coalesce(is_anonymous, false) = false
on conflict (id) do update
  set email = excluded.email;

delete from public.profiles profile
using auth.users auth_user
where profile.id = auth_user.id
  and coalesce(auth_user.is_anonymous, false) = true
  and profile.email is null
  and profile.favorite_team_id is null;
