-- Phase 3: private listing-images bucket, listing_images table, and RLS.
-- APPLY MANUALLY. Idempotent.
-- The bucket is private. The app reads images with signed URLs.
-- Storage and table SELECT policies are split so public reads of published
-- listing images never call is_nexus_admin().

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', false)
on conflict (id) do update set public = false;

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  path text not null,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists listing_images_listing_idx
  on public.listing_images (listing_id, sort_order);

alter table public.listing_images enable row level security;

drop policy if exists "Read images for visible listings" on public.listing_images;
drop policy if exists "Read images of published listings" on public.listing_images;
drop policy if exists "Owners and admins read listing images" on public.listing_images;

create policy "Read images of published listings"
  on public.listing_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.status = 'published'
    )
  );

create policy "Owners and admins read listing images"
  on public.listing_images
  for select
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.owner_id = auth.uid() or public.is_nexus_admin())
    )
  );

drop policy if exists "Owners insert listing images" on public.listing_images;
create policy "Owners insert listing images"
  on public.listing_images
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners update listing images" on public.listing_images;
create policy "Owners update listing images"
  on public.listing_images
  for update
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners delete listing images" on public.listing_images;
create policy "Owners delete listing images"
  on public.listing_images
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

-- Storage object policies. Path convention: {owner_id}/{listing_id}/{filename}
drop policy if exists "Public read listing-images" on storage.objects;
drop policy if exists "Read published listing-images" on storage.objects;
drop policy if exists "Owners and admins read listing-images" on storage.objects;
drop policy if exists "Owners upload listing-images" on storage.objects;
drop policy if exists "Owners update listing-images" on storage.objects;
drop policy if exists "Owners delete listing-images" on storage.objects;

create policy "Read published listing-images"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'listing-images'
    and exists (
      select 1 from public.listings l
      where l.id::text = (storage.foldername(name))[2]
        and l.status = 'published'
    )
  );

create policy "Owners and admins read listing-images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_nexus_admin()
    )
  );

create policy "Owners upload listing-images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners update listing-images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners delete listing-images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
