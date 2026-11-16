import { cookies, headers } from 'next/headers'
import {
  DEFAULT_LOCALE,
  detectLocale,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from './config'
import { ar } from './messages/ar'
import { en, type Messages } from './messages/en'

const dictionaries = { ar, en } as unknown as Record<Locale, Messages>

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]
}

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value
  if (isLocale(fromCookie)) return fromCookie

  const headerStore = await headers()
  return detectLocale(headerStore.get('accept-language'))
}

export async function getDictionary(locale?: Locale): Promise<Messages> {
  return getMessages(locale ?? (await getRequestLocale()))
}
