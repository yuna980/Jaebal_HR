create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  game_reminder_enabled boolean not null default true,
  attendance_tip_enabled boolean not null default true,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now()
);

create table if not exists public.notification_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null default 'web_push',
  endpoint text not null,
  keys jsonb not null default '{}'::jsonb,
  platform text not null default 'web',
  user_agent text not null default '',
  is_active boolean not null default true,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  unique (user_id, channel, endpoint)
);

create table if not exists public.notification_deliveries (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_schedule_id bigint not null references public.game_schedules(id) on delete cascade,
  notification_type text not null,
  channel text not null default 'web_push',
  status text not null check (status in ('pending', 'sent', 'failed', 'skipped')),
  sent_at timestamptz(1),
  error_message text,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  unique (user_id, game_schedule_id, notification_type, channel)
);

create index if not exists notification_subscriptions_user_active_idx
on public.notification_subscriptions (user_id, channel, is_active);

create index if not exists notification_deliveries_game_type_idx
on public.notification_deliveries (game_schedule_id, notification_type, channel, status);

alter table public.notification_preferences enable row level security;
alter table public.notification_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
on public.notification_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
on public.notification_preferences
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
on public.notification_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "notification_subscriptions_select_own" on public.notification_subscriptions;
create policy "notification_subscriptions_select_own"
on public.notification_subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "notification_subscriptions_insert_own" on public.notification_subscriptions;
create policy "notification_subscriptions_insert_own"
on public.notification_subscriptions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "notification_subscriptions_update_own" on public.notification_subscriptions;
create policy "notification_subscriptions_update_own"
on public.notification_subscriptions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "notification_deliveries_select_own" on public.notification_deliveries;
create policy "notification_deliveries_select_own"
on public.notification_deliveries
for select
to authenticated
using ((select auth.uid()) = user_id);

drop trigger if exists handle_notification_preferences_updated_at on public.notification_preferences;
create trigger handle_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_notification_subscriptions_updated_at on public.notification_subscriptions;
create trigger handle_notification_subscriptions_updated_at
before update on public.notification_subscriptions
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_notification_deliveries_updated_at on public.notification_deliveries;
create trigger handle_notification_deliveries_updated_at
before update on public.notification_deliveries
for each row execute procedure extensions.moddatetime(updated_at);
