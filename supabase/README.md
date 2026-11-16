# Supabase

This folder holds SQL that must be **applied manually** in the Supabase SQL Editor. Nothing here is run by Vercel, GitHub, or a pull request. Review each file before you run it. Never commit `.env` files or the `service_role` key.

The live schema is **not fully exported** in this repository. Migrations are written to be idempotent (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, drop/recreate policies, `to_regclass` guards for live tables that may be missing). They assume `public.is_nexus_admin()` already exists in the live database and do **not** define or replace that function (or `nexus_admin_list_users`).

## Apply SQL in this exact order

Apply **once**, from top to bottom. Do not skip Phase 1 and do not re-run Phase 1 after Phase 3 `_01` with the expectation of changing policies: that earlier file detects Phase 3 statuses/RLS and no-ops.

1. `migrations/20261116_listings_owner_publish.sql` — Phase 1: owners can update and delete their own listings. **Must be applied before `_01`.** If `_01` is already applied, this file prints a notice and leaves Phase 3 RLS in place.
2. `migrations/20261116_phase3_01_listing_fields.sql` — rich listing fields; drops any existing CHECK constraint on `listings.status` then adds `draft | pending_review | published | rejected`; splits listings SELECT policies (public published reads do not call `is_nexus_admin()`). Owners can set `draft` or `pending_review` only.
3. `migrations/20261116_phase3_02_storage_images.sql` — **private** `listing-images` bucket, `listing_images` table, split table/storage SELECT policies (published images have no function call; owner/admin is authenticated-only). The app uses signed URLs.
4. `migrations/20261116_phase3_03_profiles_favorites.sql` — `profiles` (public columns only: `id`, `display_name`, `bio`, `avatar`), auth-user backfill/trigger (no email-prefix names), `saved_listings`.
5. `migrations/20261116_phase3_04_deals_and_rpcs.sql` — `deals` table if missing, inferred columns, `propose_deal` / `approve_deal`. The deals SELECT policy is skipped with a notice if `public.conversations` is missing. Unique index: at most one open (non-completed) deal per conversation.
6. `migrations/20261116_phase3_05_moderation.sql` — `admin_review_listing` RPC (`approve` → `published`, `reject` → `rejected` with reason).
7. `migrations/20261116_phase3_06_notifications.sql` — `notification_outbox` and triggers on `inquiries` / `messages` (created only if those tables exist).
8. `migrations/20261116_phase3_07_agreement_acceptances.sql` — `brokerage_agreement_acceptances` (timestamp + agreement version). Foreign key to `brokerage_agreements` is added only if that table exists. Deal Protection acknowledgements are stored here. The agreement remains a draft pending legal review.

`schema.sql` is the original listings table and the first draft-only RLS. It is historical; do not re-run it on the live project.

## After the SQL (Supabase dashboard)

- Confirm the `listing-images` bucket exists and is **private** (the storage migration sets `public = false`). The app reads objects with signed URLs.
- TOTP must be enabled under Authentication settings so the in-app enrollment UI at `/account` can work. Administrators who enroll will be asked for a TOTP code (AAL2) before opening `/admin`.
- Keep both `/login` and `/reset-password` in the Authentication redirect allow list (see `SECURITY.md`).
- Optional email notifications: deploy `functions/notify-email` and/or add a Database Webhook on `notification_outbox` INSERT. The Next.js route `POST /api/notify/email` is also used after a new inquiry or message. Email sending is **off** unless `RESEND_API_KEY` is set. See env vars below. Do not commit keys.
- Existing dashboard steps from `SECURITY.md` still apply (Site URL, password length, leaked-password protection, rate limits/CAPTCHA, review of admin RPCs — do not change those function bodies from this repo).

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
