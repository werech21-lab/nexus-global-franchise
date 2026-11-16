# Supabase

This folder holds SQL that must be **applied manually** in the Supabase SQL Editor. Nothing here is run by Vercel, GitHub, or this pull request.

## What is in the repository

- `schema.sql` — the original listings table and the first, draft-only RLS policies. It is **not** a complete model of the live database.
- `migrations/20261116_listings_owner_publish.sql` — updates listings RLS so an owner can publish, unpublish, edit, and delete their own listings. Apply this by hand after review.

## What is still missing

The live app also uses tables and functions that are **not yet in this repository**, including inquiries, conversations, messages, conversation_reads, deals, commission_payments, brokerage_agreements, and RPCs such as `is_nexus_admin`, `nexus_admin_list_users`, `accept_inquiry`, and `admin_mark_commission_paid`.

The full live schema must be exported from the Supabase project (SQL or the dashboard schema view) and committed here later. This environment does not have database access yet, so that export could not be done in this change.

Until the listings migration is applied, Publish / Unpublish and editing a published listing may fail because the original policies only allow updates while a listing stays a draft.

Never commit `.env` files or the `service_role` key.
