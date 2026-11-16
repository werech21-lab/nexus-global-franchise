-- Phase 3: rich listing fields, pending_review / rejected statuses, and updated RLS.
-- APPLY MANUALLY in the Supabase SQL Editor after
-- 20261116_listings_owner_publish.sql. Idempotent. Does not change live data
-- until you run it. This pull request does not apply the migration.
--
-- This file replaces Phase 1 listings RLS. Re-running the Phase 1 file
-- after this one is a no-op.

alter table public.listings
  add column if not exists city text,
  add column if not exists industry text,
  add column if not exists investment_min numeric,
  add column if not exists investment_max numeric,
  add column if not exists franchise_fee numeric,
  add column if not exists royalty_percent numeric,
  add column if not exists years_in_business integer,
  add column if not exists currency text default 'KWD',
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid;

-- Drop whatever CHECK constraint currently applies to listings.status
-- (the live name may not be listings_status_check), then add the Phase 3 check.
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'listings'
      and c.contype = 'c'
      and exists (
        select 1
        from unnest(c.conkey) as col(attnum)
        join pg_attribute a
          on a.attrelid = c.conrelid
         and a.attnum = col.attnum
        where a.attname = 'status'
          and a.attisdropped = false
      )
  loop
    execute format('alter table public.listings drop constraint if exists %I', r.conname);
  end loop;
end
$$;

alter table public.listings
  add constraint listings_status_check
  check (status in ('draft', 'pending_review', 'published', 'rejected'));

create index if not exists listings_industry_idx on public.listings (industry);
create index if not exists listings_country_city_idx on public.listings (country, city);
create index if not exists listings_investment_idx on public.listings (investment_min, investment_max);
create index if not exists listings_status_created_idx on public.listings (status, created_at desc);

-- Split SELECT policies so public reads never call is_nexus_admin()
-- (EXECUTE may be revoked from anon).
drop policy if exists "Read published or owned listings" on public.listings;
drop policy if exists "Read published listings" on public.listings;
drop policy if exists "Read own or admin listings" on public.listings;

create policy "Read published listings"
  on public.listings
  for select
  to anon, authenticated
  using (status = 'published');

create policy "Read own or admin listings"
  on public.listings
  for select
  to authenticated
  using (auth.uid() = owner_id or public.is_nexus_admin());

drop policy if exists "Create own drafts" on public.listings;
create policy "Create own drafts"
  on public.listings
  for insert
  to authenticated
  with check (auth.uid() = owner_id and status = 'draft');

drop policy if exists "Update own drafts" on public.listings;
drop policy if exists "Owners can update own listings" on public.listings;
create policy "Owners can update own listings"
  on public.listings
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (
    auth.uid() = owner_id
    and status in ('draft', 'pending_review')
  );

drop policy if exists "Delete own drafts" on public.listings;
drop policy if exists "Owners can delete own listings" on public.listings;
create policy "Owners can delete own listings"
  on public.listings
  for delete
  to authenticated
  using (auth.uid() = owner_id);
