import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  inquiryEmail,
  isEmailNotifyEnabled,
  messageEmail,
  sendResendEmail,
} from '@/lib/email'

export const dynamic = 'force-dynamic'

async function recipientEmail(userId: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  const admin = createAdminClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user?.email) return null
  return data.user.email
}

export async function POST(request: Request) {
  if (!isEmailNotifyEnabled()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'disabled' })
  }

  const supabase = await createClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: { event?: string; inquiry_id?: string; message_id?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 })
  }

  try {
    if (body.event === 'new_inquiry' && body.inquiry_id) {
      const { data: inquiry } = await supabase
        .from('inquiries')
        .select('id,listing_id,investor_id')
        .eq('id', body.inquiry_id)
        .maybeSingle()
      if (!inquiry || inquiry.investor_id !== user.id) {
        return NextResponse.json({ ok: true, skipped: true })
      }
      const { data: listing } = await supabase
        .from('listings')
        .select('id,title,owner_id')
        .eq('id', inquiry.listing_id)
        .maybeSingle()
      if (!listing?.owner_id) {
        return NextResponse.json({ ok: true, skipped: true })
      }
      const to = await recipientEmail(listing.owner_id)
      if (!to) return NextResponse.json({ ok: true, skipped: true, reason: 'no-recipient' })
      const content = inquiryEmail(listing.title || 'Opportunity')
      const result = await sendResendEmail({ to, ...content })
      return NextResponse.json(result)
    }

    if (body.event === 'new_message' && body.message_id) {
      const { data: row } = await supabase
        .from('messages')
        .select('id,conversation_id,sender_id')
        .eq('id', body.message_id)
        .maybeSingle()
      if (!row || row.sender_id !== user.id) {
        return NextResponse.json({ ok: true, skipped: true })
      }
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id,owner_id,investor_id')
        .eq('id', row.conversation_id)
        .maybeSingle()
      if (!conversation) {
        return NextResponse.json({ ok: true, skipped: true })
      }
      const recipientId =
        conversation.owner_id === user.id
          ? conversation.investor_id
          : conversation.owner_id
      const to = await recipientEmail(recipientId)
      if (!to) return NextResponse.json({ ok: true, skipped: true, reason: 'no-recipient' })
      const content = messageEmail()
      const result = await sendResendEmail({ to, ...content })
      return NextResponse.json(result)
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  return NextResponse.json({ ok: true, skipped: true })
}
