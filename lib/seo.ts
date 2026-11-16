import type { Metadata } from 'next'
import { copy } from './copy'

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://nexus-global-franchise.vercel.app'

export const SITE_NAME = copy.site.name
export const SITE_DESCRIPTION = copy.site.tagline

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
    locale: 'en',
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
  path = '/'
): Metadata {
  const url = new URL(path, SITE_URL).toString()
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en',
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
