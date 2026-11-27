-- Bank-transfer payment of the 2% success commission (alongside Lemon Squeezy).
-- Additive. Flow:
--   pending --(owner submits transfer details)--> awaiting_confirmation
--   awaiting_confirmation --(admin confirms)--> paid
--   awaiting_confirmation --(admin rejects with a note)--> pending
-- Bank account details are NOT stored in the database; the server returns them
-- only to the opportunity owner of a completed deal (see lib/bank-transfer.ts).

-- 1) New status value ------------------------------------------------------
alter table public.commission_payments
  drop constraint if exists commission_payments_status_check;
alter table public.commission_payments
  add constraint commission_payments_status_check
  check (status = any (array['pending', 'awaiting_confirmation', 'paid', 'overdue']));

-- 2) Columns ---------------------------------------------------------------
alter table public.commission_payments
  add column if not exists bank_transfer_reference text,
  add column if not exists bank_transfer_date date,
  add column if not exists bank_transfer_receipt_path text,
  add column if not exists bank_transfer_submitted_at timestamptz,
  add column if not exists bank_transfer_submitted_by uuid references auth.users(id) on delete set null,
  add column if not exists bank_transfer_review_note text,
  add column if not exists bank_transfer_reviewed_at timestamptz,
  add column if not exists bank_transfer_reviewed_by uuid references auth.users(id) on delete set null;

create index if not exists commission_payments_awaiting_idx
  on public.commission_payments (bank_transfer_submitted_at)
  where status = 'awaiting_confirmation';

-- 3) Private bucket for receipts (images / PDF, max 5 MB) ---------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'commission-receipts', 'commission-receipts', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = excluded.allowed_mime_types;

-- Object path: <owner uid>/<commission payment id>/<file>
create or replace function public.can_upload_commission_receipt(p_owner text, p_payment text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or p_owner is distinct from auth.uid()::text then
    return false;
  end if;
  if p_payment is null
     or p_payment !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return exists (
    select 1
    from public.commission_payments cp
    join public.deals d on d.id = cp.deal_id
    join public.conversations c on c.id = d.conversation_id
    where cp.id = p_payment::uuid
      and c.owner_id = auth.uid()
      and d.status = 'completed'
      and cp.status = 'pending'
  );
end;
$$;
revoke execute on function public.can_upload_commission_receipt(text, text) from public, anon;
grant execute on function public.can_upload_commission_receipt(text, text) to authenticated;

drop policy if exists "Owners upload commission receipts" on storage.objects;
create policy "Owners upload commission receipts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'commission-receipts'
    and public.can_upload_commission_receipt((storage.foldername(name))[1], (storage.foldername(name))[2])
  );

drop policy if exists "Owners and admins read commission receipts" on storage.objects;
create policy "Owners and admins read commission receipts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'commission-receipts'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_nexus_admin())
  );

-- An owner can remove a receipt only while no payment record points at it.
drop policy if exists "Owners delete unused commission receipts" on storage.objects;
create policy "Owners delete unused commission receipts"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'commission-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.commission_payments cp
      where cp.bank_transfer_receipt_path = storage.objects.name
    )
  );

-- 4) Owner: amount, reference and eligibility (called with the user's session)
create or replace function public.commission_bank_transfer_context(p_payment_id uuid)
returns table (
  payment_id uuid,
  deal_id uuid,
  amount numeric,
  currency text,
  reference text,
  review_note text
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
  v_deal uuid;
  v_deal_status text;
  v_amount numeric;
  v_currency text;
  v_note text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select cp.status, d.id, d.status, d.commission_amount, d.currency, c.owner_id, cp.bank_transfer_review_note
    into v_status, v_deal, v_deal_status, v_amount, v_currency, v_owner, v_note
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

  return query select
    p_payment_id,
    v_deal,
    v_amount,
    upper(coalesce(v_currency, 'KWD')),
    'NX-' || upper(left(replace(v_deal::text, '-', ''), 8)),
    v_note;
end;
$$;
revoke execute on function public.commission_bank_transfer_context(uuid) from public, anon;
grant execute on function public.commission_bank_transfer_context(uuid) to authenticated;

-- 5) Owner: report that the transfer was made --------------------------------
create or replace function public.submit_bank_transfer(
  p_payment_id uuid,
  p_transfer_reference text,
  p_transfer_date date,
  p_receipt_path text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_status text;
  v_deal_status text;
  v_ref text := nullif(btrim(coalesce(p_transfer_reference, '')), '');
  v_path text := nullif(btrim(coalesce(p_receipt_path, '')), '');
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select cp.status, d.status, c.owner_id
    into v_status, v_deal_status, v_owner
  from public.commission_payments cp
  join public.deals d on d.id = cp.deal_id
  join public.conversations c on c.id = d.conversation_id
  where cp.id = p_payment_id
  for update of cp;

  if v_owner is null then
    raise exception 'Commission not found';
  end if;
  if v_owner <> v_uid then
    raise exception 'Only the opportunity owner can pay this commission';
  end if;
  if v_deal_status <> 'completed' then
    raise exception 'The deal is not completed';
  end if;
  if v_status <> 'pending' then
    raise exception 'This commission is not pending';
  end if;

  if v_ref is null or char_length(v_ref) < 3 or char_length(v_ref) > 100 then
    raise exception 'Transfer reference must be between 3 and 100 characters';
  end if;
  if p_transfer_date is null
     or p_transfer_date > current_date + 1
     or p_transfer_date < current_date - 365 then
    raise exception 'Invalid transfer date';
  end if;

  if v_path is not null then
    if v_path not like v_uid::text || '/' || p_payment_id::text || '/%'
       or not exists (
         select 1 from storage.objects o
         where o.bucket_id = 'commission-receipts' and o.name = v_path
       ) then
      raise exception 'Invalid receipt file';
    end if;
  end if;

  update public.commission_payments
     set status = 'awaiting_confirmation',
         payment_provider = 'bank_transfer',
         bank_transfer_reference = v_ref,
         bank_transfer_date = p_transfer_date,
         bank_transfer_receipt_path = v_path,
         bank_transfer_submitted_at = now(),
         bank_transfer_submitted_by = v_uid,
         bank_transfer_review_note = null,
         bank_transfer_reviewed_at = null,
         bank_transfer_reviewed_by = null
   where id = p_payment_id;
end;
$$;
revoke execute on function public.submit_bank_transfer(uuid, text, date, text) from public, anon;
grant execute on function public.submit_bank_transfer(uuid, text, date, text) to authenticated;

-- 6) Admin: list, confirm, reject (is_nexus_admin() is only called, not changed)
create or replace function public.admin_list_bank_transfers()
returns table (
  payment_id uuid,
  deal_id uuid,
  deal_amount numeric,
  currency text,
  commission_amount numeric,
  owner_id uuid,
  owner_email text,
  transfer_reference text,
  transfer_date date,
  receipt_path text,
  submitted_at timestamptz,
  expected_reference text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_nexus_admin() then
    raise exception 'Access denied: administrator only';
  end if;

  return query
  select cp.id, d.id, d.amount, upper(coalesce(d.currency, 'KWD')), d.commission_amount,
         c.owner_id, u.email::text,
         cp.bank_transfer_reference, cp.bank_transfer_date, cp.bank_transfer_receipt_path,
         cp.bank_transfer_submitted_at,
         'NX-' || upper(left(replace(d.id::text, '-', ''), 8))
  from public.commission_payments cp
  join public.deals d on d.id = cp.deal_id
  join public.conversations c on c.id = d.conversation_id
  left join auth.users u on u.id = c.owner_id
  where cp.status = 'awaiting_confirmation'
  order by cp.bank_transfer_submitted_at asc nulls last;
end;
$$;
revoke execute on function public.admin_list_bank_transfers() from public, anon;
grant execute on function public.admin_list_bank_transfers() to authenticated;

create or replace function public.admin_confirm_bank_transfer(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_ref text;
begin
  if auth.uid() is null or not public.is_nexus_admin() then
    raise exception 'Access denied: administrator only';
  end if;

  select status, bank_transfer_reference into v_status, v_ref
  from public.commission_payments where id = p_payment_id for update;

  if not found then
    raise exception 'Commission payment not found';
  end if;
  if v_status = 'paid' then
    raise exception 'Commission already marked as paid';
  end if;
  if v_status <> 'awaiting_confirmation' then
    raise exception 'This commission is not awaiting bank transfer confirmation';
  end if;

  update public.commission_payments
     set status = 'paid',
         paid_at = now(),
         payment_provider = 'bank_transfer',
         payment_reference = 'bank_transfer:' || coalesce(v_ref, p_payment_id::text),
         bank_transfer_reviewed_at = now(),
         bank_transfer_reviewed_by = auth.uid(),
         bank_transfer_review_note = null
   where id = p_payment_id;
end;
$$;
revoke execute on function public.admin_confirm_bank_transfer(uuid) from public, anon;
grant execute on function public.admin_confirm_bank_transfer(uuid) to authenticated;

create or replace function public.admin_reject_bank_transfer(p_payment_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_ref text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if auth.uid() is null or not public.is_nexus_admin() then
    raise exception 'Access denied: administrator only';
  end if;
  if v_note is null or char_length(v_note) < 3 or char_length(v_note) > 500 then
    raise exception 'A rejection note of 3 to 500 characters is required';
  end if;

  select status, bank_transfer_reference into v_status, v_ref
  from public.commission_payments where id = p_payment_id for update;

  if not found then
    raise exception 'Commission payment not found';
  end if;
  if v_status <> 'awaiting_confirmation' then
    raise exception 'This commission is not awaiting bank transfer confirmation';
  end if;

  update public.commission_payments
     set status = 'pending',
         payment_provider = case when provider_checkout_id is not null then 'lemonsqueezy' else null end,
         bank_transfer_review_note = v_note,
         bank_transfer_reviewed_at = now(),
         bank_transfer_reviewed_by = auth.uid(),
         notes = concat_ws(E'\n', notes,
                 format('Bank transfer %s rejected %s: %s', coalesce(v_ref, '-'), to_char(now(), 'YYYY-MM-DD'), v_note))
   where id = p_payment_id;
end;
$$;
revoke execute on function public.admin_reject_bank_transfer(uuid, text) from public, anon;
grant execute on function public.admin_reject_bank_transfer(uuid, text) to authenticated;
