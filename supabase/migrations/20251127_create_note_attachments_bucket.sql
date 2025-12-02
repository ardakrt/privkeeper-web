-- Create a storage bucket for note attachments
insert into storage.buckets (id, name, public)
values ('note_attachments', 'note_attachments', true)
on conflict (id) do nothing;

-- Set up security policies for the bucket
create policy "Authenticated users can upload note attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'note_attachments' 
    and auth.role() = 'authenticated'
  );

create policy "Users can update their own note attachments"
  on storage.objects for update
  using (
    bucket_id = 'note_attachments' 
    and auth.uid() = owner
  );

create policy "Users can delete their own note attachments"
  on storage.objects for delete
  using (
    bucket_id = 'note_attachments' 
    and auth.uid() = owner
  );

create policy "Anyone can view note attachments"
  on storage.objects for select
  using (bucket_id = 'note_attachments');
