-- Phase 3: notification outbox for new inquiries and messages.
-- APPLY MANUALLY. Idempotent. A Database Webhook or the notify-email
-- Edge Function should be pointed at this table after review.
-- Email sending is off unless RESEND_API_KEY is configured (never commit keys).

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('new_inquiry', 'new_message')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists notification_outbox_unprocessed_idx
  on public.notification_outbox (created_at)
  where processed_at is null;

alter table public.notification_outbox enable row level security;
-- No policies for authenticated/anon: only the service role (webhooks / Edge Function)
-- should read and mark rows processed.

create or replace function public.enqueue_inquiry_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_title text;
begin
  select l.owner_id, l.title into v_owner, v_title
  from public.listings l
  where l.id = new.listing_id;

  insert into public.notification_outbox (event_type, payload)
  values (
    'new_inquiry',
    jsonb_build_object(
      'inquiry_id', new.id,
      'listing_id', new.listing_id,
      'investor_id', new.investor_id,
      'owner_id', v_owner,
      'listing_title', v_title
    )
  );
  return new;
end;
$$;

create or replace function public.enqueue_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_investor uuid;
begin
  select c.owner_id, c.investor_id into v_owner, v_investor
  from public.conversations c
  where c.id = new.conversation_id;

  insert into public.notification_outbox (event_type, payload)
  values (
    'new_message',
    jsonb_build_object(
      'message_id', new.id,
      'conversation_id', new.conversation_id,
      'sender_id', new.sender_id,
      'recipient_id', case when new.sender_id = v_owner then v_investor else v_owner end
    )
  );
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.inquiries') is not null then
    drop trigger if exists inquiries_enqueue_notification on public.inquiries;
    create trigger inquiries_enqueue_notification
      after insert on public.inquiries
      for each row execute function public.enqueue_inquiry_notification();
  end if;

  if to_regclass('public.messages') is not null then
    drop trigger if exists messages_enqueue_notification on public.messages;
    create trigger messages_enqueue_notification
      after insert on public.messages
      for each row execute function public.enqueue_message_notification();
  end if;
end
$$;
