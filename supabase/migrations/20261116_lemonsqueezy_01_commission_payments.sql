-- Lemon Squeezy payment of the 2% success commission.
-- The opportunity owner (conversations.owner_id) pays the commission of a
-- completed deal. commission_payments rows are created by the existing
-- create_commission_payment trigger when a deal becomes completed.

alter table public.commission_payments
  add column if not exists payment_provider text,
  add column if not exists provider_checkout_id text,
  add column if not exists provider_checkout_created_at timestamptz,
  add column if not exists provider_expected_amount_cents integer,
  add column if not exists provider_currency text,
  add column if not exists provider_fx_rate numeric,
  add column if not exists provider_order_id text,
  add column if not exists provider_test_mode boolean;

create unique index if not exists commission_payments_provider_order_uidx
  on public.commission_payments (payment_provider, provider_order_id)
  where provider_order_id is not null;

-- Deal parties can see the payment record of their own deal (read only).
drop policy if exists "Deal parties read commission payments" on public.commission_payments;
create policy "Deal parties read commission payments"
  on public.commission_payments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.deals d
      join public.conversations c on c.id = d.conversation_id
      where d.id = commission_payments.deal_id
        and (c.owner_id = (select auth.uid()) or c.investor_id = (select auth.uid()))
    )
  );

-- Called by the checkout route with the signed-in user's session.
-- Returns the amount to charge only to the opportunity owner of a completed
-- deal whose commission is still pending.
create or replace function public.commission_checkout_context(p_payment_id uuid)
returns table (
  payment_id uuid,
  deal_id uuid,
  amount numeric,
  currency text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_status text;
  v_deal_status text;
  v_amount numeric;
  v_currency text;
  v_deal uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select cp.status, d.id, d.status, d.commission_amount, d.currency, c.owner_id
    into v_status, v_deal, v_deal_status, v_amount, v_currency, v_owner
  from public.commission_payments cp
  join public.deals d on d.id = cp.deal_id
  join public.conversations c on c.id = d.conversation_id
  where cp.id = p_payment_id;

  if v_deal is null then
    raise exception 'Commission not found';
  end if;
  if v_owner is distinct from v_uid then
    raise exception 'Only the opportunity owner can pay this commission';
  end if;
  if v_deal_status <> 'completed' then
    raise exception 'The deal is not completed';
  end if;
  if v_status <> 'pending' then
    raise exception 'This commission is not pending';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'Commission amount is not available';
  end if;

  return query select p_payment_id, v_deal, v_amount, upper(v_currency);
end;
$$;

revoke execute on function public.commission_checkout_context(uuid) from public, anon;
grant execute on function public.commission_checkout_context(uuid) to authenticated;

-- Server only (service_role): remember the checkout we created and the exact
-- amount we expect, so a webhook can be matched against it.
create or replace function public.record_commission_checkout(
  p_payment_id uuid,
  p_checkout_id text,
  p_expected_amount_cents integer,
  p_currency text,
  p_fx_rate numeric default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.commission_payments
     set payment_provider = 'lemonsqueezy',
         provider_checkout_id = p_checkout_id,
         provider_checkout_created_at = now(),
         provider_expected_amount_cents = p_expected_amount_cents,
         provider_currency = upper(p_currency),
         provider_fx_rate = p_fx_rate
   where id = p_payment_id
     and status = 'pending';
end;
$$;

revoke execute on function public.record_commission_checkout(uuid, text, integer, text, numeric) from public, anon, authenticated;
grant execute on function public.record_commission_checkout(uuid, text, integer, text, numeric) to service_role;

-- Server only (service_role), called by the verified webhook on order_created.
-- Idempotent. Marks paid only when the order matches the checkout we created.
create or replace function public.lemonsqueezy_mark_commission_paid(
  p_payment_id uuid,
  p_order_id text,
  p_amount_cents integer,
  p_currency text,
  p_test_mode boolean
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.commission_payments;
begin
  select * into v_row from public.commission_payments where id = p_payment_id for update;
  if v_row.id is null then
    return 'not_found';
  end if;

  if v_row.status = 'paid' then
    if v_row.provider_order_id = p_order_id then
      return 'already_recorded';
    end if;
    return 'already_paid';
  end if;

  if exists (
    select 1 from public.commission_payments
    where payment_provider = 'lemonsqueezy' and provider_order_id = p_order_id
  ) then
    return 'order_used';
  end if;

  if v_row.provider_expected_amount_cents is null then
    return 'no_checkout';
  end if;

  if p_amount_cents is null
     or p_amount_cents < v_row.provider_expected_amount_cents
     or upper(coalesce(p_currency, '')) <> coalesce(v_row.provider_currency, '')
  then
    update public.commission_payments
       set notes = concat_ws(E'\n', notes,
             format('Lemon Squeezy order %s did not match: %s %s, expected %s %s',
                    p_order_id, p_amount_cents, upper(p_currency),
                    v_row.provider_expected_amount_cents, v_row.provider_currency))
     where id = p_payment_id;
    return 'amount_mismatch';
  end if;

  update public.commission_payments
     set status = 'paid',
         paid_at = now(),
         payment_provider = 'lemonsqueezy',
         provider_order_id = p_order_id,
         provider_test_mode = p_test_mode,
         payment_reference = 'lemonsqueezy:' || p_order_id
   where id = p_payment_id;

  return 'paid';
end;
$$;

revoke execute on function public.lemonsqueezy_mark_commission_paid(uuid, text, integer, text, boolean) from public, anon, authenticated;
grant execute on function public.lemonsqueezy_mark_commission_paid(uuid, text, integer, text, boolean) to service_role;
