import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'
import ContactDetails from '@/components/legal/ContactDetails'
import { getDictionary } from '@/lib/i18n/dictionary'
import { localizedMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary()
  return localizedMetadata(t.legal.privacy.title, t.legal.privacy.meta, '/privacy')
}

export default async function Page() {
  const t = await getDictionary()
  return (
    <LegalPage
      title={t.legal.privacy.title}
      intro={t.legal.privacy.intro}
      updated={t.legal.updated}
      note={t.legal.subjectToUpdate}
      sections={t.legal.privacy.sections}
    >
      <ContactDetails t={t} />
    </LegalPage>
  )
}
