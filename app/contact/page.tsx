
import type { Metadata } from 'next'
import PlaceholderNotice from '@/app/components/PlaceholderNotice'
import { copy } from '@/lib/copy'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  copy.placeholders.contactTitle,
  copy.placeholders.contactBody,
  '/contact'
)

export default function Page() {
  return (
    <PlaceholderNotice
      title={copy.placeholders.contactTitle}
      body={copy.placeholders.contactBody}
    />
  )
}
