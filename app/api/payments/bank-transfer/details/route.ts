import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bankDetails } from '@/lib/bank-transfer'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fail(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Returns the bank account and the transfer reference for one commission.
 * Only the opportunity owner of a completed deal with a pending commission
 * gets an answer (commission_bank_transfer_context checks this with the
 * caller's own session); everyone else gets an error and no bank details.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) return fail('unavailable', 503)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail('unauthorized', 401)

  let body: { payment_id?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return fail('invalid', 400)
  }
  const paymentId = body.payment_id
  if (!paymentId || !UUID.test(paymentId)) return fail('invalid', 400)

  const { data: context, error } = await supabase
    .rpc('commission_bank_transfer_context', { p_payment_id: paymentId })
    .single<{
      payment_id: string
      deal_id: string
      amount: number | string
      currency: string
      reference: string
      review_note: string | null
    }>()
  if (error || !context) {
    const message = error?.message ?? ''
    if (/opportunity owner/i.test(message)) return fail('forbidden', 403)
    if (/not pending|not completed/i.test(message)) return fail('not_pending', 409)
    return fail('not_found', 404)
  }

  const bank = bankDetails()
  return NextResponse.json(
    {
      ok: true,
      amount: Number(context.amount),
      currency: context.currency,
      reference: context.reference,
      review_note: context.review_note,
      bank: {
        account_holder: bank.accountHolder,
        bank_name: bank.bankName,
        bank_name_ar: bank.bankNameAr,
        account_number: bank.accountNumber,
        iban: bank.iban,
        swift: bank.swift || null,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
