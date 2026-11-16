
import type { Metadata } from 'next'
import PlaceholderNotice from '@/app/components/PlaceholderNotice'
import { copy } from '@/lib/copy'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  copy.placeholders.termsTitle,
  copy.placeholders.termsBody,
  '/terms'
)

export default function Page() {
  return (
    <PlaceholderNotice
      title={copy.placeholders.termsTitle}
      body={copy.placeholders.termsBody}
    />
  )
}
