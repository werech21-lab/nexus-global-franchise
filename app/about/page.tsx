
import type { Metadata } from 'next'
import PlaceholderNotice from '@/components/legal/PlaceholderNotice'
import { getDictionary } from '@/lib/i18n/dictionary'
import { localizedMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary()
  return localizedMetadata(t.placeholders.aboutTitle, t.placeholders.aboutBody, '/about')
}

export default async function Page() {
  const t = await getDictionary()
  return (
    <PlaceholderNotice
      title={t.placeholders.aboutTitle}
      body={t.placeholders.aboutBody}
    />
  )
}
