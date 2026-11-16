import PageShell from '@/components/ui/PageShell'
import ListingsExplorer from '@/features/listings/ListingsExplorer'
import { getPublishedListings } from '@/features/listings/queries'
import { getDictionary } from '@/lib/i18n/dictionary'

export const dynamic = 'force-dynamic'

export default async function ListingsPage() {
  const t = await getDictionary()
  const listings = await getPublishedListings()

  return (
    <PageShell
      kicker={t.listings.kicker}
      title={t.listings.title}
      intro={t.listings.intro}
    >
      <ListingsExplorer listings={listings} />
    </PageShell>
  )
}
