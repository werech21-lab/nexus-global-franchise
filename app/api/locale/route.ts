import { NextResponse } from 'next/server'
import { isLocale, LOCALE_COOKIE, LOCALE_MAX_AGE } from '@/lib/i18n'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { locale?: string }
    if (!isLocale(body.locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
    }

    const response = NextResponse.json({ ok: true, locale: body.locale })
    response.cookies.set(LOCALE_COOKIE, body.locale, {
      path: '/',
      maxAge: LOCALE_MAX_AGE,
      sameSite: 'lax',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
