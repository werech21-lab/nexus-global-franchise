-- Listings RLS: allow owners to publish, unpublish, edit, and delete
-- their own listings.
--
-- APPLY MANUALLY in the Supabase SQL Editor. This repository does not
-- run migrations automatically, and this pull request does not change
-- any live database settings or data.

-- Recreate read/insert policies so this file can be applied safely
-- on a project that already has the original listings policies.

drop policy if exists "Read published or owned listings" on public.listings;
create policy "Read published or owned listings"
  on public.listings
  for select
  using (status = 'published' or auth.uid() = owner_id);

drop policy if exists "Create own drafts" on public.listings;
create policy "Create own drafts"
  on public.listings
  for insert
  to authenticated
  with check (auth.uid() = owner_id and status = 'draft');

-- Replace draft-only update/delete rules with owner-wide rules.
drop policy if exists "Update own drafts" on public.listings;
drop policy if exists "Owners can update own listings" on public.listings;
create policy "Owners can update own listings"
  on public.listings
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and status in ('draft', 'published')
  );

drop policy if exists "Delete own drafts" on public.listings;
drop policy if exists "Owners can delete own listings" on public.listings;
create policy "Owners can delete own listings"
  on public.listings
  for delete
  to authenticated
  using (auth.uid() = owner_id);
