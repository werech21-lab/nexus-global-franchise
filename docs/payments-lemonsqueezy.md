# Commission payments with Lemon Squeezy

The 2% success commission of a completed deal is paid by the opportunity owner
(`conversations.owner_id`) through a Lemon Squeezy checkout.

## Flow

1. When both parties approve, the deal becomes `completed` and the existing trigger
   creates a `commission_payments` row with status `pending`.
2. On `/dashboard/deals` the owner sees **Pay commission / ادفع العمولة**.
3. `POST /api/payments/lemonsqueezy/checkout` (server only):
   - calls `commission_checkout_context(payment_id)` with the user's session
     (only the owner, only a completed deal, only while pending);
   - converts the amount to the store currency (see below);
   - creates a checkout with `custom_price` and custom data
     `{ commission_payment_id, deal_id, source: "nexus-global-franchise" }`;
   - stores the checkout id and expected amount via `record_commission_checkout` (service role).
4. Lemon Squeezy sends `order_created` to `POST /api/payments/lemonsqueezy/webhook`:
   - the `X-Signature` HMAC-SHA256 of the raw body is verified with `LEMONSQUEEZY_WEBHOOK_SECRET`;
   - events without our `source` tag are ignored (the store is shared with other products);
   - `lemonsqueezy_mark_commission_paid` (service role only) marks the row paid.
     It is idempotent (same order id = `already_recorded`) and refuses orders whose
     amount or currency does not match the checkout we created.

## Currency

Lemon Squeezy charges in the store currency (currently USD). Deals in the same currency
are charged as is. Deals in another currency (the default is KWD) can only be paid online
when an explicit rate is configured in `COMMISSION_FX_RATES` (for example `KWD:3.25`).
No rate is guessed; without one the owner is asked to contact Nexus.

## Setup

- Create a one-time (not subscription) product "Nexus deal commission" in the store
  and set `LEMONSQUEEZY_VARIANT_ID` to its variant id. Its list price does not matter,
  every checkout sets a custom price.
- Add the env vars listed in `.env.example` to Vercel.
- Webhook URL: `https://nexus-global-franchise.vercel.app/api/payments/lemonsqueezy/webhook`,
  event `order_created`.
- Test mode: set `LEMONSQUEEZY_ACCEPT_TEST_MODE=true`. For live, use a live API key, a live
  product/variant and a live webhook, and remove that variable.

Database migration: `supabase/migrations/20261116_lemonsqueezy_01_commission_payments.sql`.
