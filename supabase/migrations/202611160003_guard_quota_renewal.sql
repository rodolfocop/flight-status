-- Sem data/hora confirmada, não existe renovação automática por calendário.
create table public.quota_guard (
  provider text primary key check (provider in ('flights', 'stays')),
  used integer not null default 0 check (used >= 0),
  next_reset_at timestamptz
);
alter table public.quota_guard enable row level security;
revoke all on public.quota_guard from anon, authenticated;
grant select, insert, update on public.quota_guard to service_role;

create or replace function public.quota_guard_status(p_provider text)
returns table(used integer, next_reset_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare current_row public.quota_guard%rowtype;
begin
  if p_provider not in ('flights', 'stays') then raise exception 'invalid quota'; end if;
  insert into public.quota_guard(provider, used)
    select p_provider, coalesce(sum(q.used), 0)::integer from public.api_quota q where q.provider = p_provider
    on conflict (provider) do nothing;
  select * into current_row from public.quota_guard q where q.provider = p_provider for update;
  if current_row.next_reset_at is not null and current_row.next_reset_at <= now() then
    update public.quota_guard q set used = 0, next_reset_at = null where q.provider = p_provider returning * into current_row;
  end if;
  return query select current_row.used, current_row.next_reset_at;
end;
$$;
revoke all on function public.quota_guard_status(text) from public, anon, authenticated;
grant execute on function public.quota_guard_status(text) to service_role;

create or replace function public.reserve_api_request(p_provider text, p_cycle_start date, p_automatic boolean)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer; ceiling integer;
begin
  if p_provider not in ('flights', 'stays') then raise exception 'invalid quota'; end if;
  perform public.quota_guard_status(p_provider);
  select q.used into n from public.quota_guard q where q.provider = p_provider for update;
  ceiling := case when p_provider = 'stays' then 100 when p_automatic then 40 else 50 end;
  if n >= ceiling then return -1; end if;
  update public.quota_guard set used = quota_guard.used + 1 where provider = p_provider returning used into n;
  return n;
end;
$$;
revoke all on function public.reserve_api_request(text, date, boolean) from public, anon, authenticated;
grant execute on function public.reserve_api_request(text, date, boolean) to service_role;
