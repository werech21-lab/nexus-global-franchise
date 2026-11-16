# Supabase

This folder holds SQL that must be **applied manually** in the Supabase SQL Editor. Nothing here is run by Vercel, GitHub, or a pull request. Review each file before you run it. Never commit `.env` files or the `service_role` key.

The live schema is **not fully exported** in this repository. Migrations are written to be idempotent (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, drop/recreate policies). They assume `public.is_nexus_admin()` already exists in the live database and do **not** replace that function.

## Apply SQL in this order

1. `migrations/20261116_listings_owner_publish.sql` — Phase 1: owners can update and delete their own listings (needed before later listing-status changes).
2. `migrations/20261116_phase3_01_listing_fields.sql` — rich listing fields, `pending_review` / `rejected` statuses, updated listings RLS (owners can set `draft` or `pending_review` only; they cannot publish directly).
3. `migrations/20261116_phase3_02_storage_images.sql` — public `listing-images` storage bucket, `listing_images` table, storage and table RLS.
4. `migrations/20261116_phase3_03_profiles_favorites.sql` — `profiles`, auth-user backfill/trigger, `saved_listings`.
5. `migrations/20261116_phase3_04_deals_and_rpcs.sql` — `deals` table if missing, inferred columns, `propose_deal` and `approve_deal` RPCs.
6. `migrations/20261116_phase3_05_moderation.sql` — `admin_review_listing` RPC (`approve` → `published`, `reject` → `rejected` with reason).
7. `migrations/20261116_phase3_06_notifications.sql` — `notification_outbox` and triggers on `inquiries` / `messages` (created only if those tables exist).
8. `migrations/20261116_phase3_07_agreement_acceptances.sql` — `brokerage_agreement_acceptances` (timestamp + agreement version). Deal Protection acknowledgements are stored here, not as extra rows in `brokerage_agreements`. The agreement remains a draft pending legal review.

`schema.sql` is the original listings table and the first draft-only RLS. It is historical; do not re-run it on the live project.

## After the SQL (Supabase dashboard)

- Confirm the `listing-images` bucket exists and is public (the storage migration inserts it).
- Enable MFA (TOTP) under Authentication settings so the in-app enrollment UI at `/account` can work. Administrators who enroll will be asked for a TOTP code (AAL2) before opening `/admin`.
- Optional email notifications: deploy `functions/notify-email` and/or add a Database Webhook on `notification_outbox` INSERT. The Next.js route `POST /api/notify/email` is also used after a new inquiry or message. Email sending is **off** unless `RESEND_API_KEY` is set. See env vars below. Do not commit keys.
- Existing dashboard steps from `SECURITY.md` still apply (Site URL, reset redirect, password length, leaked-password protection, rate limits/CAPTCHA, review of admin RPCs).

## Env vars (set later in Vercel; do not commit)

Already used:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional, for email notifications only:

- `RESEND_API_KEY` — required to send email; feature stays off if absent.
- `RESEND_FROM` — verified sender, for example `Nexus Global Franchise <noreply@your-domain>`. If omitted, Resend's onboarding sender may be used for tests only.
- `SUPABASE_SERVICE_ROLE_KEY` — used only on the server (or Edge Function secrets) to resolve recipient emails from Auth. Never expose this to the browser or commit it.

## What is still missing from the repo

Inquiries, conversations, messages, conversation_reads, commission_payments, brokerage_agreements, and RPCs such as `is_nexus_admin`, `nexus_admin_list_users`, `accept_inquiry`, and `admin_mark_commission_paid` live in the production database and are not fully exported here. Export the complete live schema later.

Until the Phase 1 and Phase 3 listing migrations are applied, publishing, pending review, images, favorites, profiles, deal proposal RPCs, moderation, and agreement acknowledgements will fail or be incomplete.
