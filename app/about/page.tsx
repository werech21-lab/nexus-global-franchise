import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'
import ContactDetails from '@/components/legal/ContactDetails'
import { getDictionary } from '@/lib/i18n/dictionary'
import { localizedMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary()
  return localizedMetadata(t.legal.about.title, t.legal.about.meta, '/about')
}

export default async function Page() {
  const t = await getDictionary()
  return (
    <LegalPage title={t.legal.about.title} intro={t.legal.about.intro} sections={t.legal.about.sections}>
      <ContactDetails t={t} />
    </LegalPage>
  )
}
