// @ts-nocheck
// Supabase Edge Function: send email for notification_outbox rows or webhook payloads.
// Secrets to set in the Supabase dashboard (do not commit values):
//   RESEND_API_KEY, RESEND_FROM, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Deploy later, manually. This function is a no-op without RESEND_API_KEY.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

type Payload = {
  event_type?: string
  type?: string
  record?: {
    event_type?: string
    payload?: Record<string, string>
  }
  payload?: Record<string, string>
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return { ok: true, skipped: true }
  const from = Deno.env.get('RESEND_FROM') || 'Nexus Global Franchise <onboarding@resend.dev>'
  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  })
  if (!response.ok) {
    return { ok: false, error: `Resend HTTP ${response.status}` }
  }
  return { ok: true }
}

async function userEmail(userId: string): Promise<string | null> {
  const url = Deno.env.get('SUPABASE_URL') || Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key || !userId) return null
  const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${key}`, apikey: key },
  })
  if (!response.ok) return null
  const body = await response.json()
  return body?.email || body?.user?.email || null
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json({ ok: false }, 405)
  if (!Deno.env.get('RESEND_API_KEY')) {
    return json({ ok: true, skipped: true, reason: 'disabled' })
  }

  let body: Payload
  try {
    body = (await request.json()) as Payload
  } catch {
    return json({ ok: false, error: 'invalid' }, 400)
  }

  const eventType = body.event_type || body.type || body.record?.event_type
  const payload = body.payload || body.record?.payload || {}

  try {
    if (eventType === 'new_inquiry') {
      const ownerId = payload.owner_id
      const to = ownerId ? await userEmail(ownerId) : null
      // If owner_id is not in the payload, the Next.js route path should be used instead.
      if (!to) return json({ ok: true, skipped: true, reason: 'no-recipient' })
      const title = payload.listing_title || 'Opportunity'
      return json(
        await sendEmail(
          to,
          `New inquiry / استفسار جديد — ${title}`,
          `You received a new inquiry on "${title}".\n\nوصلك استفسار جديد عن "${title}".`
        )
      )
    }

    if (eventType === 'new_message') {
      const recipientId = payload.recipient_id
      const to = recipientId ? await userEmail(recipientId) : null
      if (!to) return json({ ok: true, skipped: true, reason: 'no-recipient' })
      return json(
        await sendEmail(
          to,
          'New message / رسالة جديدة — Nexus Global Franchise',
          'You received a new message in a Nexus conversation.\n\nوصلك رسالة جديدة في محادثة Nexus.'
        )
      )
    }
  } catch {
    return json({ ok: false }, 500)
  }

  return json({ ok: true, skipped: true })
})
