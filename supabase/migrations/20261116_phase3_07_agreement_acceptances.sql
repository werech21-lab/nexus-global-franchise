-- Phase 3: store Deal Protection acceptances with timestamp and agreement version.
-- APPLY MANUALLY. Idempotent.
-- Acceptances are stored in brokerage_agreement_acceptances, linked to
-- brokerage_agreements by id and version. The agreement itself remains a
-- legal draft until the site owner finalizes it.

create table if not exists public.brokerage_agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agreement_id uuid not null,
  agreement_version text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, agreement_id, agreement_version)
);

create index if not exists brokerage_acceptances_user_idx
  on public.brokerage_agreement_acceptances (user_id, accepted_at desc);

alter table public.brokerage_agreement_acceptances enable row level security;

drop policy if exists "Users read own agreement acceptances"
  on public.brokerage_agreement_acceptances;
create policy "Users read own agreement acceptances"
  on public.brokerage_agreement_acceptances
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_nexus_admin());

drop policy if exists "Users record own agreement acceptances"
  on public.brokerage_agreement_acceptances;
create policy "Users record own agreement acceptances"
  on public.brokerage_agreement_acceptances
  for insert
  to authenticated
  with check (auth.uid() = user_id);
