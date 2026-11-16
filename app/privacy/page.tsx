
import type { Metadata } from 'next'
import PlaceholderNotice from '@/components/legal/PlaceholderNotice'
import { getDictionary } from '@/lib/i18n/dictionary'
import { localizedMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary()
  return localizedMetadata(t.placeholders.privacyTitle, t.placeholders.privacyBody, '/privacy')
}

export default async function Page() {
  const t = await getDictionary()
  return (
    <PlaceholderNotice
      title={t.placeholders.privacyTitle}
      body={t.placeholders.privacyBody}
    />
  )
}
