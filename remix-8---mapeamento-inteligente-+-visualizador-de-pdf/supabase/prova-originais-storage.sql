-- Execute once in the Supabase SQL Editor as the project administrator.
-- Original PDFs/images stay private; provas.data stores their references.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prova-originais', 'prova-originais', false, 10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists prova_originais_read on storage.objects;
create policy prova_originais_read on storage.objects for select to authenticated
using (bucket_id = 'prova-originais' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists prova_originais_insert on storage.objects;
create policy prova_originais_insert on storage.objects for insert to authenticated
with check (bucket_id = 'prova-originais' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists prova_originais_delete on storage.objects;
create policy prova_originais_delete on storage.objects for delete to authenticated
using (bucket_id = 'prova-originais' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Restrictive guards protect this bucket even if an older broad policy exists.
-- Other buckets keep their existing access rules. Original objects are immutable.
drop policy if exists prova_originais_private_read on storage.objects;
create policy prova_originais_private_read on storage.objects as restrictive for select to public
using (bucket_id <> 'prova-originais' or
  ((select auth.uid()) is not null and (storage.foldername(name))[1] = (select auth.uid())::text));
drop policy if exists prova_originais_private_insert on storage.objects;
create policy prova_originais_private_insert on storage.objects as restrictive for insert to public
with check (bucket_id <> 'prova-originais' or
  ((select auth.uid()) is not null and (storage.foldername(name))[1] = (select auth.uid())::text));
drop policy if exists prova_originais_private_delete on storage.objects;
create policy prova_originais_private_delete on storage.objects as restrictive for delete to public
using (bucket_id <> 'prova-originais' or
  ((select auth.uid()) is not null and (storage.foldername(name))[1] = (select auth.uid())::text));
drop policy if exists prova_originais_immutable on storage.objects;
create policy prova_originais_immutable on storage.objects as restrictive for update to public
using (bucket_id <> 'prova-originais') with check (bucket_id <> 'prova-originais');
commit;
