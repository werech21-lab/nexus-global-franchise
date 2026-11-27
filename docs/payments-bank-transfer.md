# Commission payments by bank transfer

Second way to pay the 2% success commission, next to Lemon Squeezy
(see `payments-lemonsqueezy.md`). The opportunity owner (`conversations.owner_id`)
of a completed deal pays; Nexus confirms by hand.

## Status flow (`commission_payments.status`)

```
pending --owner submits transfer details--> awaiting_confirmation   (payment_provider = bank_transfer)
awaiting_confirmation --admin confirms-->   paid                    (paid_at = now())
awaiting_confirmation --admin rejects-->    pending                 (bank_transfer_review_note = reason)
```

`awaiting_confirmation` was added to `commission_payments_status_check`.
While a payment is awaiting confirmation the owner cannot start a Lemon Squeezy
checkout (the checkout RPCs only accept `pending`).

## Owner flow (`/dashboard/deals`)

1. Next to **ادفع العمولة** there is **تحويل بنكي**.
2. It opens `POST /api/payments/bank-transfer/details` (session required). The route calls
   `commission_bank_transfer_context(payment_id)` with the user's session, which only answers
   for the owner of a completed deal whose commission is `pending`. Everyone else gets 401/403/409
   and **no bank details**.
3. The panel shows account holder, bank, account number, IBAN (copy buttons), the commission amount
   in the deal currency, and a reference to put in the transfer note: `NX-` + first 8 hex chars
   of the deal id, upper case.
4. The owner submits the bank's transfer reference, the date and an optional receipt
   (image or PDF, max 5 MB). The receipt goes to the private bucket `commission-receipts`
   at `<owner uid>/<payment id>/<file>`; then `submit_bank_transfer(...)` moves the payment to
   `awaiting_confirmation`.
5. If the admin rejects, the payment is `pending` again and the reason is shown to the owner.

## Admin flow (`/admin`)

The admin dashboard lists transfers awaiting confirmation (`admin_list_bank_transfers()`), with owner email,
amount, reference, date and a receipt link (short-lived signed URL). **Confirm payment**
calls `admin_confirm_bank_transfer` (status `paid`, `paid_at`, `payment_reference = bank_transfer:<ref>`).
**Reject** requires a note (3-500 chars) and calls `admin_reject_bank_transfer`.
All three RPCs are `SECURITY DEFINER` and call `is_nexus_admin()` (unchanged).

## Bank details

Server side config in `lib/bank-transfer.ts`. Override with env vars (all optional):
`BANK_TRANSFER_ACCOUNT_HOLDER`, `BANK_TRANSFER_BANK_NAME`, `BANK_TRANSFER_BANK_NAME_AR`,
`BANK_TRANSFER_ACCOUNT_NUMBER`, `BANK_TRANSFER_IBAN`, `BANK_TRANSFER_SWIFT`.
The defaults are the Nexus account published to payers (ABDULLAH AWIRAH, Al Ahli Bank of Kuwait).
They are not stored in the database and not in any public page or client bundle
(`lib/bank-transfer.ts` is only imported by the API route).

## Currency

The account is in KWD. The amount is shown in the deal currency. For a non-KWD deal no rate is guessed:
the owner is told to transfer the equivalent and the admin verifies the amount before confirming.

## Database

Migration: `supabase/migrations/20261127_bank_transfer_01_commission.sql` (additive: status value,
`bank_transfer_*` columns, bucket + storage policies, 5 functions).
