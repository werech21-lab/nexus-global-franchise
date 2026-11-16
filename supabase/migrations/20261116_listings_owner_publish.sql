-- Listings RLS: allow owners to publish, unpublish, edit, and delete
-- their own listings.
--
-- APPLY MANUALLY in the Supabase SQL Editor, and only BEFORE
-- 20261116_phase3_01_listing_fields.sql. This file is a no-op if Phase 3
-- listing statuses or RLS are already present, so re-running it after _01
-- will not overwrite pending_review policies.
--
-- This repository does not run migrations automatically, and this pull
-- request does not change any live database settings or data.

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'listings'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%pending_review%'
  ) or exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'listings'
      and policyname in (
        'Read published listings',
        'Read own or admin listings'
      )
  ) then
    raise notice
      'Skipping 20261116_listings_owner_publish.sql: Phase 3 listing statuses or RLS already applied. Leave listings RLS to 20261116_phase3_01_listing_fields.sql.';
    return;
  end if;

  execute 'drop policy if exists "Read published or owned listings" on public.listings';
  -- Public reads must not call is_nexus_admin() (EXECUTE may be revoked from anon).
  execute $pol$
    create policy "Read published or owned listings"
      on public.listings
      for select
      to anon, authenticated
      using (status = 'published' or auth.uid() = owner_id)
  $pol$;

  execute 'drop policy if exists "Create own drafts" on public.listings';
  execute $pol$
    create policy "Create own drafts"
      on public.listings
      for insert
      to authenticated
      with check (auth.uid() = owner_id and status = 'draft')
  $pol$;

  execute 'drop policy if exists "Update own drafts" on public.listings';
  execute 'drop policy if exists "Owners can update own listings" on public.listings';
  execute $pol$
    create policy "Owners can update own listings"
      on public.listings
      for update
      to authenticated
      using (auth.uid() = owner_id)
      with check (
        auth.uid() = owner_id
        and status in ('draft', 'published')
      )
  $pol$;

  execute 'drop policy if exists "Delete own drafts" on public.listings';
  execute 'drop policy if exists "Owners can delete own listings" on public.listings';
  execute $pol$
    create policy "Owners can delete own listings"
      on public.listings
      for delete
      to authenticated
      using (auth.uid() = owner_id)
  $pol$;
end
$$;
