import Link from 'next/link'
import type { ListingSummary } from '@/types/listing'
import type { Messages } from '@/lib/i18n'
import ListingCard from './ListingCard'
import EmptyState from '@/components/ui/EmptyState'

export default function FeaturedListings({
  listings,
  messages,
}: {
  listings: ListingSummary[]
  messages: Messages
}) {
  return (
    <section className="space-y-5 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">{messages.home.featuredTitle}</h2>
          <p className="mt-2 text-slate-300">{messages.home.featuredIntro}</p>
        </div>
        <Link href="/listings" className="text-sm font-semibold">
          {messages.home.viewAll}
          <span className="inline-block ltr:ml-1 rtl:mr-1 rtl:rotate-180">→</span>
        </Link>
      </div>

      {listings.length === 0 ? (
        <EmptyState title={messages.home.featuredEmpty} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {listings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </section>
  )
}
