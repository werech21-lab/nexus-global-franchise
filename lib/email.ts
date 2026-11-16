const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export function isEmailNotifyEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function sendResendEmail(options: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: true, skipped: true }

  const from =
    process.env.RESEND_FROM || 'Nexus Global Franchise <onboarding@resend.dev>'

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html || options.text.replace(/\n/g, '<br />'),
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    return { ok: false, error: body || `Resend HTTP ${response.status}` }
  }

  return { ok: true }
}

export function inquiryEmail(listingTitle: string) {
  return {
    subject: `New inquiry / استفسار جديد — ${listingTitle}`,
    text: [
      `You received a new inquiry on "${listingTitle}" in Nexus Global Franchise.`,
      'Sign in to your dashboard to review it.',
      '',
      `وصلك استفسار جديد عن "${listingTitle}" في Nexus Global Franchise.`,
      'سجّل الدخول إلى لوحة التحكم لمراجعته.',
    ].join('\n'),
  }
}

export function messageEmail() {
  return {
    subject: 'New message / رسالة جديدة — Nexus Global Franchise',
    text: [
      'You received a new message in a Nexus conversation. Sign in to reply.',
      '',
      'وصلك رسالة جديدة في محادثة Nexus. سجّل الدخول للرد.',
    ].join('\n'),
  }
}
