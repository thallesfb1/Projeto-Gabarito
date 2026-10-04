-- Apply after ai-reading-jobs.sql, before deploying the new reading flow.
-- Additive migration: preserves all exams, jobs and originals.
begin;
alter table public.ai_reading_jobs add column if not exists started_at timestamptz;
alter table public.ai_reading_jobs add column if not exists progress jsonb;
alter table public.ai_reading_jobs drop constraint if exists ai_reading_jobs_status_check;
alter table public.ai_reading_jobs add constraint ai_reading_jobs_status_check
  check (status in ('queued','running','saving','ready','failed','cancelled','completed'));
drop index if exists public.ai_reading_jobs_active_owner;
create unique index ai_reading_jobs_active_owner on public.ai_reading_jobs(user_id) where status in ('queued','running','saving');
drop index if exists public.ai_reading_jobs_pending_proof;
create unique index ai_reading_jobs_pending_proof on public.ai_reading_jobs(user_id, proof_id) where status in ('queued','running','saving','ready');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-reading-results', 'ai-reading-results', false, 10485760, array['application/json'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/json'];
drop policy if exists ai_reading_results_select on storage.objects;
drop policy if exists ai_reading_results_insert on storage.objects;
drop policy if exists ai_reading_results_update on storage.objects;
drop policy if exists ai_reading_results_delete on storage.objects;
create policy ai_reading_results_select on storage.objects for select to authenticated
using (bucket_id = 'ai-reading-results' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy ai_reading_results_insert on storage.objects for insert to authenticated
with check (bucket_id = 'ai-reading-results' and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.ai_reading_jobs j where j.id::text = (storage.foldername(name))[2] and j.user_id = (select auth.uid())));
create policy ai_reading_results_update on storage.objects for update to authenticated
using (bucket_id = 'ai-reading-results' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'ai-reading-results' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy ai_reading_results_delete on storage.objects for delete to authenticated
using (bucket_id = 'ai-reading-results' and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
