-- Private bucket for punch-in/punch-out selfies. Uploads happen server-side
-- via the Route Handler (service-role key), which bypasses these policies;
-- they exist so a signed/authenticated client read or direct upload is still
-- scoped to the employee's own folder: punch-photos/{user_id}/...

insert into storage.buckets (id, name, public)
values ('punch-photos', 'punch-photos', false)
on conflict (id) do nothing;

create policy "punch_photos_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'punch-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "punch_photos_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'punch-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
