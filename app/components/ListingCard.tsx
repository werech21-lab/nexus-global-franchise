
import Link from 'next/link'
import { copy } from '@/lib/copy'
import { opportunityLabel, type ListingSummary } from '@/lib/listings'

export default function ListingCard({ listing }: { listing: ListingSummary }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card block transition hover:-translate-y-1 hover:border-amber-400"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300">
          {opportunityLabel(listing.opportunity_type)}
        </span>
        <span className="rounded-full bg-slate-700 px-3 py-1 text-xs">
          {listing.country || copy.listings.worldwide}
        </span>
      </div>

      <h2 className="text-xl font-bold text-white">{listing.title}</h2>

      <p className="mt-3 line-clamp-3 text-sm text-slate-300">
        {listing.description || copy.listings.noDescription}
      </p>

      <div className="mt-6 border-t border-slate-700 pt-4 font-semibold text-amber-300">
        {copy.listings.view}
      </div>
    </Link>
  )
}
