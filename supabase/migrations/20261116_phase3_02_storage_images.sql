-- Phase 3: listing image storage bucket, listing_images table, and RLS.
-- APPLY MANUALLY. Idempotent.

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = excluded.public;

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
create policy "Read images for visible listings"
  on public.listing_images
  for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (
          l.status = 'published'
          or l.owner_id = auth.uid()
          or public.is_nexus_admin()
        )
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

drop policy if exists "Public read listing-images" on storage.objects;
create policy "Public read listing-images"
  on storage.objects
  for select
  using (bucket_id = 'listing-images');

drop policy if exists "Owners upload listing-images" on storage.objects;
create policy "Owners upload listing-images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners update listing-images" on storage.objects;
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

drop policy if exists "Owners delete listing-images" on storage.objects;
create policy "Owners delete listing-images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
