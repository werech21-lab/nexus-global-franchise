import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import InquiryForm from '@/features/listings/InquiryForm'
import Badge from '@/components/ui/Badge'
import {
  getCurrentUserId,
  getPublishedListing,
  hasExistingInquiry,
} from '@/features/listings/queries'
import { getDictionary, getRequestLocale } from '@/lib/i18n/dictionary'
import { opportunityLabel } from '@/lib/listings'
import { formatDate } from '@/lib/format'
import { pageMetadata, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const locale = await getRequestLocale()
  const t = await getDictionary(locale)
  const fallback = pageMetadata(SITE_NAME, t.site.tagline || SITE_DESCRIPTION, `/listings/${id}`, locale)

  const listing = await getPublishedListing(id)
  if (!listing?.title) return fallback

  const description = (listing.description || t.site.tagline || SITE_DESCRIPTION).slice(0, 160)
  return pageMetadata(listing.title, description, `/listings/${id}`, locale)
}

export default async function ListingDetailsPage({ params }: Props) {
  const { id } = await params
  const t = await getDictionary()
  const locale = await getRequestLocale()
  const listing = await getPublishedListing(id)

  if (!listing) notFound()

  const userId = await getCurrentUserId()
  const alreadyInquired =
    userId && userId !== listing.owner_id
      ? await hasExistingInquiry(listing.id, userId)
      : false

  return (
    <section className="space-y-8 py-8">
      <Link href="/listings" className="text-amber-300">
        <span className="inline-block rtl:rotate-180">←</span> {t.common.backToListings}
      </Link>

      <div className="card space-y-6">
        <div className="flex flex-wrap gap-3">
          <Badge tone="gold">
            {opportunityLabel(listing.opportunity_type, t)}
          </Badge>
          <Badge>{listing.country || t.listings.worldwide}</Badge>
        </div>

        <h1 className="text-3xl font-bold md:text-4xl">{listing.title}</h1>

        <div className="border-t border-slate-700 pt-6">
          <h2 className="mb-4 text-2xl font-bold">{t.listings.aboutTitle}</h2>
          <p className="whitespace-pre-wrap leading-8 text-slate-300">
            {listing.description || t.listings.noDescription}
          </p>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <p className="text-sm text-slate-400">
            {t.listings.listedOn} {formatDate(listing.created_at, locale)}
          </p>
        </div>
      </div>

      <InquiryForm
        listing={listing}
        userId={userId}
        alreadyInquired={alreadyInquired}
      />
    </section>
  )
}
