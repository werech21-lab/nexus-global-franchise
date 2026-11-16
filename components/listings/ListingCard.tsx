'use client'

import Link from 'next/link'
import { useLocale, useT } from '@/lib/i18n/provider'
import {
  coverPath,
  industryLabel,
  listingImageUrl,
  opportunityLabel,
  type ListingSummary,
} from '@/lib/listings'
import { investmentRangeLabel } from '@/lib/investment'

export default function ListingCard({ listing }: { listing: ListingSummary }) {
  const t = useT()
  const locale = useLocale()
  const image = listingImageUrl(coverPath(listing))
  const investment = investmentRangeLabel(listing, t, locale)
  const place = [listing.city, listing.country || t.listings.worldwide]
    .filter(Boolean)
    .join(', ')
  const industry = industryLabel(listing.industry, t)

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card block overflow-hidden !p-0 transition hover:-translate-y-1 hover:border-amber-400"
    >
      <div className="relative aspect-[16/9] w-full bg-slate-800">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl text-slate-500">
            🏢
          </div>
        )}
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300">
            {opportunityLabel(listing.opportunity_type, t)}
          </span>
          {industry ? (
            <span className="rounded-full bg-slate-700 px-3 py-1 text-xs">{industry}</span>
          ) : null}
          <span className="rounded-full bg-slate-700 px-3 py-1 text-xs">{place}</span>
        </div>

        <h2 className="text-lg font-bold text-white sm:text-xl">{listing.title}</h2>

        <p className="line-clamp-3 text-sm text-slate-300">
          {listing.description || t.listings.noDescription}
        </p>

        {investment ? (
          <p className="text-sm font-semibold text-amber-200">
            {t.listings.investment}: {investment}
          </p>
        ) : null}

        <div className="border-t border-slate-700 pt-3 font-semibold text-amber-300">
          {t.listings.view}
          <span className="inline-block ltr:ml-1 rtl:mr-1 rtl:rotate-180">→</span>
        </div>
      </div>
    </Link>
  )
}
