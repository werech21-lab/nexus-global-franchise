-- Phase 3: deals table (if missing), inferred columns, and deal lifecycle RPCs.
-- APPLY MANUALLY. Idempotent. Mirrors columns used by the existing app:
-- id, conversation_id, amount, currency, status, commission_rate,
-- commission_amount, investor_approved, owner_approved,
-- investor_approved_at, owner_approved_at, created_at.

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  amount numeric,
  currency text not null default 'KWD',
  status text not null default 'proposed',
  commission_rate numeric,
  commission_amount numeric,
  investor_approved boolean not null default false,
  owner_approved boolean not null default false,
  investor_approved_at timestamptz,
  owner_approved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.deals add column if not exists conversation_id uuid;
alter table public.deals add column if not exists amount numeric;
alter table public.deals add column if not exists currency text;
alter table public.deals add column if not exists status text;
alter table public.deals add column if not exists commission_rate numeric;
alter table public.deals add column if not exists commission_amount numeric;
alter table public.deals add column if not exists investor_approved boolean;
alter table public.deals add column if not exists owner_approved boolean;
alter table public.deals add column if not exists investor_approved_at timestamptz;
alter table public.deals add column if not exists owner_approved_at timestamptz;
alter table public.deals add column if not exists created_at timestamptz;

alter table public.deals enable row level security;

drop policy if exists "Deal participants can read deals" on public.deals;
create policy "Deal participants can read deals"
  on public.deals
  for select
  using (
    public.is_nexus_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.owner_id = auth.uid() or c.investor_id = auth.uid())
    )
  );

-- Inserts and approval updates go through SECURITY DEFINER RPCs, not direct writes.

create or replace function public.propose_deal(
  p_conversation_id uuid,
  p_amount numeric,
  p_currency text default 'KWD'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_investor uuid;
  v_existing uuid;
  v_rate numeric := 0.02;
  v_deal_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select c.owner_id, c.investor_id
    into v_owner, v_investor
  from public.conversations c
  where c.id = p_conversation_id;

  if v_owner is null then
    raise exception 'Conversation not found';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Only the opportunity owner can propose a deal';
  end if;

  select d.id into v_existing
  from public.deals d
  where d.conversation_id = p_conversation_id
    and d.status is distinct from 'completed'
  order by d.created_at desc
  limit 1;

  if v_existing is not null then
    raise exception 'An open deal already exists for this conversation';
  end if;

  insert into public.deals (
    conversation_id,
    amount,
    currency,
    status,
    commission_rate,
    commission_amount,
    investor_approved,
    owner_approved
  )
  values (
    p_conversation_id,
    p_amount,
    coalesce(nullif(trim(p_currency), ''), 'KWD'),
    'proposed',
    v_rate,
    round(p_amount * v_rate, 3),
    false,
    false
  )
  returning id into v_deal_id;

  return v_deal_id;
end;
$$;

revoke all on function public.propose_deal(uuid, numeric, text) from public;
grant execute on function public.propose_deal(uuid, numeric, text) to authenticated;

create or replace function public.approve_deal(p_deal_id uuid)
returns public.deals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deal public.deals;
  v_owner uuid;
  v_investor uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_deal from public.deals where id = p_deal_id for update;
  if v_deal.id is null then
    raise exception 'Deal not found';
  end if;

  if v_deal.status = 'completed' then
    raise exception 'This deal is already completed';
  end if;

  select c.owner_id, c.investor_id
    into v_owner, v_investor
  from public.conversations c
  where c.id = v_deal.conversation_id;

  if v_owner is null then
    raise exception 'Conversation not found';
  end if;

  if auth.uid() = v_investor then
    if v_deal.investor_approved then
      raise exception 'You have already approved this deal';
    end if;
    update public.deals
      set investor_approved = true,
          investor_approved_at = now()
      where id = p_deal_id;
  elsif auth.uid() = v_owner then
    if v_deal.owner_approved then
      raise exception 'You have already approved this deal';
    end if;
    update public.deals
      set owner_approved = true,
          owner_approved_at = now()
      where id = p_deal_id;
  else
    raise exception 'You are not a party to this deal';
  end if;

  update public.deals
    set status = case
      when investor_approved and owner_approved then 'approved'
      else 'proposed'
    end
    where id = p_deal_id
  returning * into v_deal;

  return v_deal;
end;
$$;

revoke all on function public.approve_deal(uuid) from public;
grant execute on function public.approve_deal(uuid) to authenticated;
