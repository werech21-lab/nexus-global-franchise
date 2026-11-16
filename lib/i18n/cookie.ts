import { NextResponse, type NextRequest } from 'next/server'
import {
  detectLocale,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_MAX_AGE,
} from './config'

export function applyLocaleCookie(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const current = request.cookies.get(LOCALE_COOKIE)?.value
  if (isLocale(current)) return response

  const locale = detectLocale(request.headers.get('accept-language'))
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: LOCALE_MAX_AGE,
    sameSite: 'lax',
  })
  return response
}
