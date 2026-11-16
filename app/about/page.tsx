
import type { Metadata } from 'next'
import PlaceholderNotice from '@/app/components/PlaceholderNotice'
import { copy } from '@/lib/copy'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  copy.placeholders.aboutTitle,
  copy.placeholders.aboutBody,
  '/about'
)

export default function Page() {
  return (
    <PlaceholderNotice
      title={copy.placeholders.aboutTitle}
      body={copy.placeholders.aboutBody}
    />
  )
}
