import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'
import ContactDetails from '@/components/legal/ContactDetails'
import { getDictionary } from '@/lib/i18n/dictionary'
import { localizedMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary()
  return localizedMetadata(t.legal.contact.title, t.legal.contact.meta, '/contact')
}

export default async function Page() {
  const t = await getDictionary()
  return (
    <LegalPage title={t.legal.contact.title} intro={t.legal.contact.intro}>
      <ContactDetails t={t} />
    </LegalPage>
  )
}
