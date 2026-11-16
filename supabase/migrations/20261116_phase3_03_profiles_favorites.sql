-- Phase 3: public profiles and saved/favorite listings.
-- APPLY MANUALLY. Idempotent.
-- Public profile reads are limited to id, display_name, bio, and avatar.
-- display_name is never defaulted to an email prefix.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_len
    check (display_name is null or char_length(display_name) between 1 and 80),
  constraint profiles_bio_len
    check (bio is null or char_length(bio) <= 1000),
  constraint profiles_avatar_len
    check (avatar is null or char_length(avatar) <= 2000)
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists avatar text;
alter table public.profiles add column if not exists created_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles
  for select
  to anon, authenticated
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

-- Row-level policies are not enough to hide non-public columns (email, timestamps).
revoke all on table public.profiles from public;
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select (id, display_name, bio, avatar) on table public.profiles to anon, authenticated;
grant insert (id, display_name, bio, avatar) on table public.profiles to authenticated;
grant update (display_name, bio, avatar, updated_at) on table public.profiles to authenticated;

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'display_name', '')
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_profile() from public;
revoke all on function public.handle_new_profile() from anon;
revoke all on function public.handle_new_profile() from authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_profile();

-- Backfill profiles for existing users when this is first applied.
-- Do not copy the email prefix into display_name.
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(u.raw_user_meta_data->>'name', ''),
    nullif(u.raw_user_meta_data->>'display_name', '')
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
