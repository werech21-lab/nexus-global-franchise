'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/provider'
import { opportunityLabel, type ListingSummary } from '@/lib/listings'

export default function ListingCard({ listing }: { listing: ListingSummary }) {
  const t = useT()

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card block transition hover:-translate-y-1 hover:border-amber-400"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300">
          {opportunityLabel(listing.opportunity_type, t)}
        </span>
        <span className="rounded-full bg-slate-700 px-3 py-1 text-xs">
          {listing.country || t.listings.worldwide}
        </span>
      </div>

      <h2 className="text-xl font-bold text-white">{listing.title}</h2>

      <p className="mt-3 line-clamp-3 text-sm text-slate-300">
        {listing.description || t.listings.noDescription}
      </p>

      <div className="mt-6 border-t border-slate-700 pt-4 font-semibold text-amber-300">
        {t.listings.view}
        <span className="inline-block ltr:ml-1 rtl:mr-1 rtl:rotate-180">→</span>
      </div>
    </Link>
  )
}
