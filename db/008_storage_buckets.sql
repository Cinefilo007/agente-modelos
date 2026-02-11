-- Create Verifications Bucket
insert into storage.buckets (id, name, public) 
values ('verifications', 'verifications', true)
on conflict (id) do nothing;

-- Create Profiles Bucket (for avatars/covers) if not exists
insert into storage.buckets (id, name, public) 
values ('profiles', 'profiles', true)
on conflict (id) do nothing;

-- Policies (Optional if using service role, but good practice for future direct upload)
-- Allow authenticated users to upload to verifications 
create policy "Authenticated can upload verification"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'verifications' );

create policy "Public can view verifications"
  on storage.objects for select
  to public
  using ( bucket_id = 'verifications' );

-- Allow authenticated users to upload to profiles
create policy "Authenticated can upload profiles"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'profiles' );

create policy "Public can view profiles"
  on storage.objects for select
  to public
  using ( bucket_id = 'profiles' );
