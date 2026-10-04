-- Additive migration. Run as project administrator; preserves provas and originals.
begin;
create table if not exists public.ai_reading_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  proof_id text not null check (length(proof_id) between 1 and 160),
  mode text not null check (mode in ('exam', 'key')),
  source jsonb not null,
  target_snapshot jsonb,
  version_hint text not null default '' check (length(version_hint) <= 160),
  status text not null default 'queued' check (status in ('queued','running','ready','failed','cancelled','completed')),
  extraction jsonb,
  error text,
  lease_token uuid,
  lease_expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ai_reading_jobs_owner_created on public.ai_reading_jobs(user_id, created_at desc);
-- One costly reading per account, independent of tabs or server instances.
create unique index if not exists ai_reading_jobs_active_owner on public.ai_reading_jobs(user_id) where status in ('queued','running');
create unique index if not exists ai_reading_jobs_pending_proof on public.ai_reading_jobs(user_id, proof_id) where status in ('queued','running','ready');
alter table public.ai_reading_jobs enable row level security;
revoke all on public.ai_reading_jobs from anon;
grant select, insert, update, delete on public.ai_reading_jobs to authenticated;
do $$ begin
if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_reading_jobs' and policyname = 'ai_reading_jobs_owner') then
create policy ai_reading_jobs_owner on public.ai_reading_jobs for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and source->>'ownerId' = (select auth.uid())::text
  and split_part(source->>'path', '/', 1) = (select auth.uid())::text
  and split_part(source->>'path', '/', 2) = proof_id);
end if;
end $$;
commit;
