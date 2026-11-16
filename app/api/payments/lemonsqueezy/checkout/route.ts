import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import {
  chargeAmount,
  createCommissionCheckout,
  getStoreCurrency,
  lemonConfig,
} from '@/lib/lemonsqueezy'
import { SITE_URL } from '@/lib/seo'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fail(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status })
}

export async function POST(request: Request) {
  const config = lemonConfig()
  const admin = createServiceClient()
  if (!config || !admin) return fail('not_configured', 503)

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

  // Runs as the signed-in user: the function only answers for the opportunity
  // owner of a completed deal whose commission is still pending.
  const { data: context, error: contextError } = await supabase
    .rpc('commission_checkout_context', { p_payment_id: paymentId })
    .single<{ payment_id: string; deal_id: string; amount: number | string; currency: string }>()
  if (contextError || !context) {
    const message = contextError?.message ?? ''
    if (/opportunity owner/i.test(message)) return fail('forbidden', 403)
    if (/not pending|not completed/i.test(message)) return fail('not_pending', 409)
    return fail('not_found', 404)
  }

  const storeCurrency = await getStoreCurrency(config)
  if (!storeCurrency) return fail('provider_unavailable', 502)

  const charge = chargeAmount(Number(context.amount), context.currency, storeCurrency)
  if (!charge) {
    return fail('currency_unsupported', 409, {
      deal_currency: context.currency,
      store_currency: storeCurrency,
    })
  }
  if (charge.cents < 50) return fail('amount_too_small', 409)

  const checkout = await createCommissionCheckout(config, {
    paymentId: context.payment_id,
    dealId: context.deal_id,
    cents: charge.cents,
    email: user.email,
    redirectUrl: `${SITE_URL}/dashboard/deals?commission=paid`,
    description: `2% success commission for deal ${context.deal_id} (${context.amount} ${context.currency})`,
  })
  if (!checkout) return fail('provider_unavailable', 502)

  const { error: recordError } = await admin.rpc('record_commission_checkout', {
    p_payment_id: context.payment_id,
    p_checkout_id: checkout.id,
    p_expected_amount_cents: charge.cents,
    p_currency: charge.currency,
    p_fx_rate: charge.rate,
  })
  if (recordError) {
    console.error('record_commission_checkout failed', recordError.code)
    return fail('record_failed', 500)
  }

  return NextResponse.json({
    ok: true,
    url: checkout.url,
    amount_cents: charge.cents,
    currency: charge.currency,
    rate: charge.rate,
    deal_amount: Number(context.amount),
    deal_currency: context.currency,
  })
}
