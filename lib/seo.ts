import type { Metadata } from 'next'
import {
  DEFAULT_LOCALE,
  openGraphLocale,
  type Locale,
} from '@/lib/i18n'
import { getDictionary, getRequestLocale } from '@/lib/i18n/dictionary'

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://nexus-global-franchise.vercel.app'

export const SITE_NAME = 'Nexus Global Franchise'

export const SITE_DESCRIPTION =
  'Global franchise, business sale and partnership opportunities'

export const defaultMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: openGraphLocale(DEFAULT_LOCALE),
    alternateLocale: ['en_US', 'ar_KW'],
    url: SITE_URL,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
}

export function pageMetadata(
  title: string,
  description: string,
  path = '/',
  locale: Locale = DEFAULT_LOCALE
): Metadata {
  const url = new URL(path, SITE_URL).toString()
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: openGraphLocale(locale),
      alternateLocale: locale === 'ar' ? ['en_US'] : ['ar_KW'],
      url,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export async function localizedMetadata(
  title: string,
  description: string,
  path = '/'
): Promise<Metadata> {
  const locale = await getRequestLocale()
  return pageMetadata(title, description, path, locale)
}

export async function siteMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale()
  const t = await getDictionary(locale)
  return {
    ...defaultMetadata,
    description: t.site.tagline,
    openGraph: {
      ...defaultMetadata.openGraph,
      locale: openGraphLocale(locale),
      alternateLocale: locale === 'ar' ? ['en_US'] : ['ar_KW'],
      description: t.site.tagline,
    },
    twitter: {
      ...defaultMetadata.twitter,
      description: t.site.tagline,
    },
  }
}
