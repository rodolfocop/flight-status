create extension if not exists pgcrypto;

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  origin text not null, destination text not null, destination_name text not null,
  departure_date date not null, return_date date,
  passengers integer not null check (passengers between 1 and 9),
  max_price numeric check (max_price is null or max_price > 0),
  max_stops integer check (max_stops is null or max_stops between 0 and 3),
  monitor_until date not null, active boolean not null default true,
  last_attempt_at timestamptz, last_checked_at timestamptz,
  last_error text, created_at timestamptz not null default now()
);
create table public.flight_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  search_id uuid not null references public.saved_searches(id) on delete cascade,
  checked_at timestamptz not null default now(), offers jsonb not null,
  lowest_price numeric, currency text not null default 'BRL'
);
create index flight_snapshots_search_date on public.flight_snapshots(search_id, checked_at desc);
create table public.stay_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query_key text not null, checked_at timestamptz not null default now(),
  offers jsonb not null
);
create index stay_snapshots_key_date on public.stay_snapshots(user_id, query_key, checked_at desc);
create table public.api_quota (
  provider text not null, cycle_start date not null, used integer not null default 0,
  primary key (provider, cycle_start)
);
alter table public.saved_searches enable row level security;
alter table public.flight_snapshots enable row level security;
alter table public.stay_snapshots enable row level security;
alter table public.api_quota enable row level security;
create policy "Owner manages searches" on public.saved_searches for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Owner reads flight snapshots" on public.flight_snapshots for select to authenticated
  using (user_id = auth.uid());
create policy "Owner reads stay snapshots" on public.stay_snapshots for select to authenticated
  using (user_id = auth.uid());
revoke all on public.api_quota from anon, authenticated;

-- All callers reserve a request under the same row lock. Only the server can call it.
create or replace function public.reserve_api_request(p_provider text, p_cycle_start date, p_automatic boolean)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer; ceiling integer;
begin
  if p_provider not in ('flights', 'stays') or p_cycle_start is null then
    raise exception 'invalid quota';
  end if;
  ceiling := case when p_provider = 'stays' then 100 when p_automatic then 40 else 50 end;
  insert into public.api_quota(provider, cycle_start, used) values(p_provider, p_cycle_start, 0)
    on conflict (provider, cycle_start) do nothing;
  select used into n from public.api_quota where provider = p_provider and cycle_start = p_cycle_start for update;
  if n >= ceiling then return -1; end if;
  update public.api_quota set used = used + 1 where provider = p_provider and cycle_start = p_cycle_start returning used into n;
  return n;
end;
$$;
revoke all on function public.reserve_api_request(text, date, boolean) from public, anon, authenticated;
grant execute on function public.reserve_api_request(text, date, boolean) to service_role;
