export const LOCALES = ['ar', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'ar'

export const LOCALE_COOKIE = 'NEXT_LOCALE'

export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'ar' || value === 'en'
}

export function localeDir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

export function localeTag(locale: Locale): string {
  return locale === 'ar' ? 'ar-KW' : 'en-US'
}

export function openGraphLocale(locale: Locale): string {
  return locale === 'ar' ? 'ar_KW' : 'en_US'
}

function quality(match: RegExpMatchArray | null): number {
  if (!match) return -1
  return match[1] ? Number.parseFloat(match[1]) : 1
}

/**
 * Prefer Arabic when the header is missing or Arabic and English
 * are equally acceptable, so Kuwait / MENA visitors get Arabic first.
 */
export function detectLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE

  const header = acceptLanguage.toLowerCase()
  const ar = header.match(/(?:^|,)\s*ar(?:-[a-z]+)?(?:;q=([0-9.]+))?/)
  const en = header.match(/(?:^|,)\s*en(?:-[a-z]+)?(?:;q=([0-9.]+))?/)
  const arQuality = quality(ar)
  const enQuality = quality(en)

  if (enQuality > arQuality) return 'en'
  return 'ar'
}
