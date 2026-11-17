-- Preferências pertencem à conta, sem alterar pesquisas ou históricos existentes.
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  time_zone text not null check (char_length(time_zone) between 1 and 100)
);
alter table public.user_preferences enable row level security;
create policy "Users manage their preferences" on public.user_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.user_preferences to authenticated;

-- Uma reivindicação atômica usa o fuso da conta no instante da execução.
create or replace function public.claim_due_search(p_search_id uuid, p_user_id uuid, p_now timestamptz)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare zone text; local_day date;
begin
  select time_zone into zone from public.user_preferences where user_id = p_user_id for share;
  if zone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = zone) then return false; end if;
  local_day := (p_now at time zone zone)::date;
  update public.saved_searches set last_attempt_at = p_now
    where id = p_search_id and user_id = p_user_id and active
      and monitor_until >= local_day and departure_date >= local_day
      and (last_attempt_at is null or (last_attempt_at <= p_now - interval '20 hours' and (last_attempt_at at time zone zone)::date < local_day));
  return found;
end;
$$;
revoke all on function public.claim_due_search(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_due_search(uuid, uuid, timestamptz) to service_role;
