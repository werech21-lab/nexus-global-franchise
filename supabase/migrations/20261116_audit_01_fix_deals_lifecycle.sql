-- Audit fix C1: the deals lifecycle was broken.
--  * propose_deal / approve_deal wrote status values ('proposed', 'approved')
--    that deals_status_check rejects (negotiating, agreed, completed, cancelled).
--  * The legacy trigger function nexus_protect_deal read NEW.investor_id /
--    NEW.owner_id, columns that do not exist on public.deals, so every
--    INSERT/UPDATE on deals failed.
-- This keeps the live CHECK and the existing completed deal untouched,
-- rewrites the trigger function to use the conversation's participants,
-- and aligns both RPCs with the live status values.
-- Lifecycle: negotiating -> (both parties approve) -> completed.
-- Completion creates the pending commission_payments row (existing trigger).
-- deals.commission_amount is generated from amount * commission_rate.

create or replace function public.nexus_protect_deal()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_investor uuid;
  v_owner uuid;
begin
  select c.investor_id, c.owner_id
    into v_investor, v_owner
  from public.conversations c
  where c.id = new.conversation_id;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if tg_op = 'INSERT' then
    if new.investor_approved is distinct from false
       or new.owner_approved is distinct from false
       or new.investor_approved_at is not null
       or new.owner_approved_at is not null
       or new.status is distinct from 'negotiating'
    then
      raise exception 'New deals must start as negotiating without approvals';
    end if;

    if v_uid is not null and v_uid is distinct from v_owner then
      raise exception 'Only the opportunity owner can propose a deal';
    end if;

    return new;
  end if;

  -- UPDATE
  if old.status = 'completed' then
    raise exception 'Completed deals cannot be modified';
  end if;

  if new.id is distinct from old.id
     or new.conversation_id is distinct from old.conversation_id
     or new.amount is distinct from old.amount
     or new.currency is distinct from old.currency
     or new.commission_rate is distinct from old.commission_rate
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Deal details cannot be modified';
  end if;

  -- Signed-in users never set status directly; it follows the approvals.
  -- Database administrators (no JWT) may still cancel or correct a deal.
  if v_uid is not null and new.status is distinct from old.status then
    raise exception 'Deal status is managed automatically';
  end if;

  if new.investor_approved is distinct from old.investor_approved then
    if v_uid is not null and v_uid is distinct from v_investor then
      raise exception 'Only the investor can change investor approval';
    end if;
    new.investor_approved_at := case when new.investor_approved then now() else null end;
  elsif new.investor_approved_at is distinct from old.investor_approved_at then
    raise exception 'Investor approval timestamp cannot be modified';
  end if;

  if new.owner_approved is distinct from old.owner_approved then
    if v_uid is not null and v_uid is distinct from v_owner then
      raise exception 'Only the owner can change owner approval';
    end if;
    new.owner_approved_at := case when new.owner_approved then now() else null end;
  elsif new.owner_approved_at is distinct from old.owner_approved_at then
    raise exception 'Owner approval timestamp cannot be modified';
  end if;

  if new.status = 'negotiating'
     and new.investor_approved is true
     and new.owner_approved is true
  then
    new.status := 'completed';
  end if;

  return new;
end;
$$;

create or replace function public.propose_deal(
  p_conversation_id uuid,
  p_amount numeric,
  p_currency text default 'KWD'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_currency text;
  v_rate numeric := 0.02;
  v_deal_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  v_currency := upper(coalesce(nullif(trim(p_currency), ''), 'KWD'));
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Currency must be a 3-letter code';
  end if;

  select c.owner_id into v_owner
  from public.conversations c
  where c.id = p_conversation_id;

  if v_owner is null then
    raise exception 'Conversation not found';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Only the opportunity owner can propose a deal';
  end if;

  -- deals.conversation_id is unique: one deal per conversation.
  if exists (select 1 from public.deals d where d.conversation_id = p_conversation_id) then
    raise exception 'A deal already exists for this conversation';
  end if;

  -- commission_amount is a generated column: round(amount * commission_rate, 2)
  insert into public.deals (
    conversation_id, amount, currency, status,
    commission_rate, investor_approved, owner_approved
  )
  values (
    p_conversation_id, p_amount, v_currency, 'negotiating',
    v_rate, false, false
  )
  returning id into v_deal_id;

  return v_deal_id;
end;
$$;

create or replace function public.approve_deal(p_deal_id uuid)
returns public.deals
language plpgsql
security definer
set search_path = public, pg_temp
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

  if v_deal.status = 'cancelled' then
    raise exception 'This deal was cancelled';
  end if;

  select c.owner_id, c.investor_id into v_owner, v_investor
  from public.conversations c
  where c.id = v_deal.conversation_id;

  if v_owner is null then
    raise exception 'Conversation not found';
  end if;

  if auth.uid() = v_investor then
    if v_deal.investor_approved then
      raise exception 'You have already approved this deal';
    end if;
    update public.deals set investor_approved = true
      where id = p_deal_id
      returning * into v_deal;
  elsif auth.uid() = v_owner then
    if v_deal.owner_approved then
      raise exception 'You have already approved this deal';
    end if;
    update public.deals set owner_approved = true
      where id = p_deal_id
      returning * into v_deal;
  else
    raise exception 'You are not a party to this deal';
  end if;

  -- The trigger sets the approval time and completes the deal
  -- once both parties have approved.
  return v_deal;
end;
$$;

revoke execute on function public.propose_deal(uuid, numeric, text) from public, anon;
revoke execute on function public.approve_deal(uuid) from public, anon;
grant execute on function public.propose_deal(uuid, numeric, text) to authenticated;
grant execute on function public.approve_deal(uuid) to authenticated;

-- The commission trigger was "AFTER INSERT OR UPDATE OF status", so it only
-- fired when the UPDATE statement listed status. Completion is now set by the
-- BEFORE trigger, so fire on every update; create_commission_payment() itself
-- only acts on the transition into 'completed' and is idempotent.
drop trigger if exists create_commission_payment_trigger on public.deals;
create trigger create_commission_payment_trigger
  after insert or update on public.deals
  for each row execute function public.create_commission_payment();
