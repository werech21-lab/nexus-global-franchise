import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'
import ContactDetails from '@/components/legal/ContactDetails'
import { getDictionary } from '@/lib/i18n/dictionary'
import { localizedMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary()
  return localizedMetadata(t.legal.terms.title, t.legal.terms.meta, '/terms')
}

export default async function Page() {
  const t = await getDictionary()
  return (
    <LegalPage
      title={t.legal.terms.title}
      intro={t.legal.terms.intro}
      updated={t.legal.updated}
      note={t.legal.subjectToUpdate}
      sections={t.legal.terms.sections}
    >
      <ContactDetails t={t} />
    </LegalPage>
  )
}
