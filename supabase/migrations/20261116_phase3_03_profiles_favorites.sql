-- Phase 3: public profiles and saved/favorite listings.
-- APPLY MANUALLY. Idempotent.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_len
    check (display_name is null or char_length(display_name) between 1 and 80),
  constraint profiles_bio_len
    check (bio is null or char_length(bio) <= 1000)
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles
  for select
  using (true);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_profile();

-- Backfill profiles for existing users when this is first applied.
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(u.raw_user_meta_data->>'name', ''),
    split_part(coalesce(u.email, 'user'), '@', 1)
  )
from auth.users u
on conflict (id) do nothing;

create table if not exists public.saved_listings (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists saved_listings_listing_idx on public.saved_listings (listing_id);

alter table public.saved_listings enable row level security;

drop policy if exists "Users read own saved listings" on public.saved_listings;
create policy "Users read own saved listings"
  on public.saved_listings
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users save listings" on public.saved_listings;
create policy "Users save listings"
  on public.saved_listings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users unsave listings" on public.saved_listings;
create policy "Users unsave listings"
  on public.saved_listings
  for delete
  to authenticated
  using (auth.uid() = user_id);
