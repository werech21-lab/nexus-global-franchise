create extension if not exists pgcrypto;
create table if not exists public.listings (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 3 and 200),
 description text not null check (char_length(description) between 10 and 10000),
 country text not null,
 opportunity_type text not null check (opportunity_type in ('franchise','business_sale','partnership','exclusive_agency')),
 status text not null default 'draft' check (status in ('draft','published')),
 created_at timestamptz not null default now()
);
create index if not exists listings_owner_idx on public.listings(owner_id);
create index if not exists listings_public_idx on public.listings(status,created_at desc);
alter table public.listings enable row level security;
drop policy if exists "Read published or owned listings" on public.listings;
create policy "Read published or owned listings" on public.listings for select using (status = 'published' or auth.uid() = owner_id);
drop policy if exists "Create own drafts" on public.listings;
create policy "Create own drafts" on public.listings for insert to authenticated with check (auth.uid() = owner_id and status = 'draft');
drop policy if exists "Update own drafts" on public.listings;
create policy "Update own drafts" on public.listings for update to authenticated using (auth.uid() = owner_id and status = 'draft') with check (auth.uid() = owner_id and status = 'draft');
drop policy if exists "Delete own drafts" on public.listings;
create policy "Delete own drafts" on public.listings for delete to authenticated using (auth.uid() = owner_id and status = 'draft');
