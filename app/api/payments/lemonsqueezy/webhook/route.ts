import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { COMMISSION_SOURCE, verifyWebhookSignature } from '@/lib/lemonsqueezy'

export const dynamic = 'force-dynamic'

type OrderEvent = {
  meta?: {
    event_name?: string
    test_mode?: boolean
    custom_data?: { commission_payment_id?: string; source?: string } | null
  }
  data?: {
    id?: string
    type?: string
    attributes?: {
      status?: string
      currency?: string
      subtotal?: number
      discount_total?: number
      test_mode?: boolean
    }
  }
}

function ok(result: string) {
  return NextResponse.json({ ok: true, result })
}

export async function POST(request: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  const admin = createServiceClient()
  if (!secret || !admin) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }

  const rawBody = await request.text()
  if (!verifyWebhookSignature(rawBody, request.headers.get('x-signature'), secret)) {
    return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 401 })
  }

  let event: OrderEvent
  try {
    event = JSON.parse(rawBody) as OrderEvent
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 })
  }

  const eventName = request.headers.get('x-event-name') || event.meta?.event_name
  if (eventName !== 'order_created') return ok('ignored_event')

  // The store is shared with other products: only handle our own checkouts.
  const custom = event.meta?.custom_data
  if (!custom || custom.source !== COMMISSION_SOURCE || !custom.commission_payment_id) {
    return ok('ignored_not_commission')
  }

  const order = event.data
  const attributes = order?.attributes
  if (order?.type !== 'orders' || !order.id || !attributes) return ok('ignored_invalid_order')
  if (attributes.status !== 'paid') return ok('ignored_unpaid')

  const testMode = Boolean(event.meta?.test_mode ?? attributes.test_mode)
  if (testMode && process.env.LEMONSQUEEZY_ACCEPT_TEST_MODE !== 'true') {
    return ok('ignored_test_mode')
  }

  const { data, error } = await admin.rpc('lemonsqueezy_mark_commission_paid', {
    p_payment_id: custom.commission_payment_id,
    p_order_id: String(order.id),
    p_amount_cents:
      typeof attributes.subtotal === 'number'
        ? attributes.subtotal - (attributes.discount_total ?? 0)
        : null,
    p_currency: attributes.currency ?? null,
    p_test_mode: testMode,
  })
  if (error) {
    // Non-2xx makes Lemon Squeezy retry the delivery.
    console.error('lemonsqueezy_mark_commission_paid failed', error.code)
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 })
  }

  return ok(String(data))
}
