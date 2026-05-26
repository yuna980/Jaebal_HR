create table if not exists public.api_rate_limits (
  scope text not null,
  client_key text not null,
  request_count integer not null default 0 check (request_count >= 0),
  reset_at timestamptz(1) not null,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  primary key (scope, client_key)
);

create index if not exists api_rate_limits_reset_at_idx
on public.api_rate_limits (reset_at);

alter table public.api_rate_limits enable row level security;

drop trigger if exists handle_api_rate_limits_updated_at on public.api_rate_limits;
create trigger handle_api_rate_limits_updated_at
before update on public.api_rate_limits
for each row execute procedure extensions.moddatetime(updated_at);

create or replace function public.consume_api_rate_limit(
  p_scope text,
  p_client_key text,
  p_window_seconds integer default 60,
  p_max_requests integer default 60
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.api_rate_limits%rowtype;
begin
  if p_scope is null or btrim(p_scope) = '' then
    raise exception 'rate limit scope is required';
  end if;

  if p_client_key is null or btrim(p_client_key) = '' then
    raise exception 'rate limit client key is required';
  end if;

  if p_window_seconds <= 0 or p_max_requests <= 0 then
    raise exception 'rate limit window and max requests must be positive';
  end if;

  insert into public.api_rate_limits (
    scope,
    client_key,
    request_count,
    reset_at,
    created_at,
    updated_at
  )
  values (
    p_scope,
    p_client_key,
    1,
    v_now + make_interval(secs => p_window_seconds),
    v_now,
    v_now
  )
  on conflict (scope, client_key) do update
  set
    request_count = case
      when public.api_rate_limits.reset_at <= v_now then 1
      else least(public.api_rate_limits.request_count + 1, p_max_requests + 1)
    end,
    reset_at = case
      when public.api_rate_limits.reset_at <= v_now then v_now + make_interval(secs => p_window_seconds)
      else public.api_rate_limits.reset_at
    end,
    updated_at = v_now
  returning * into v_row;

  allowed := v_row.request_count <= p_max_requests;
  remaining := greatest(p_max_requests - v_row.request_count, 0);
  reset_at := v_row.reset_at;
  return next;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from public;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;
