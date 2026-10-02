-- Apply in the existing project's SQL editor. This script preserves all proofs.
-- Review existing policies before applying in production.
begin;
alter table public.provas enable row level security;
revoke all on table public.provas from anon;
grant select, insert, update, delete on table public.provas to authenticated;

drop policy if exists "gabarito_owner_access" on public.provas;
create policy "gabarito_owner_access" on public.provas
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Restrictive policy prevents an older permissive policy from exposing other accounts.
drop policy if exists "gabarito_owner_guard" on public.provas;
create policy "gabarito_owner_guard" on public.provas
  as restrictive for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists provas_user_id_idx on public.provas(user_id);
commit;
