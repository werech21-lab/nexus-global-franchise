import { Suspense } from 'react'
import PageShell from '@/components/ui/PageShell'
import ListingCard from '@/components/listings/ListingCard'
import EmptyState from '@/components/ui/EmptyState'
import ListingsFilters from '@/features/listings/ListingsFilters'
import ListingsPagination from '@/features/listings/ListingsPagination'
import { searchPublishedListings } from '@/features/listings/queries'
import { getDictionary } from '@/lib/i18n/dictionary'
import { interpolate } from '@/lib/i18n'
import { parseSort } from '@/lib/listings'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

export default async function ListingsPage({ searchParams }: Props) {
  const t = await getDictionary()
  const raw = await searchParams
  const params = {
    q: first(raw.q),
    country: first(raw.country),
    industry: first(raw.industry),
    investMin: first(raw.investMin),
    investMax: first(raw.investMax),
    sort: parseSort(first(raw.sort)),
    page: Number(first(raw.page) || '1') || 1,
  }
  const result = await searchPublishedListings(params)

  return (
    <PageShell
      kicker={t.listings.kicker}
      title={t.listings.title}
      intro={t.listings.intro}
    >
      <div className="space-y-6">
        <Suspense fallback={null}>
          <ListingsFilters />
        </Suspense>

        <p className="text-slate-400">
          {interpolate(t.listings.results, { count: result.total })}
        </p>

        {result.listings.length === 0 ? (
          <EmptyState title={t.listings.empty} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        <ListingsPagination
          page={result.page}
          pageCount={result.pageCount}
          query={{
            q: params.q,
            country: params.country,
            industry: params.industry,
            investMin: params.investMin,
            investMax: params.investMax,
            sort: params.sort === 'newest' ? undefined : params.sort,
          }}
          messages={t}
        />
      </div>
    </PageShell>
  )
}
