import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import InquiryForm from '@/features/listings/InquiryForm'
import SaveButton from '@/features/listings/SaveButton'
import Badge from '@/components/ui/Badge'
import {
  getCurrentUserId,
  getPublishedListing,
  getPublicProfile,
  hasExistingInquiry,
  isListingSaved,
} from '@/features/listings/queries'
import { getDictionary, getRequestLocale } from '@/lib/i18n/dictionary'
import {
  coverImageSrc,
  industryLabel,
  listingImageUrl,
  opportunityLabel,
} from '@/lib/listings'
import { investmentRangeLabel } from '@/lib/investment'
import { formatDate, formatMoney } from '@/lib/format'
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
  const saved = userId ? await isListingSaved(listing.id, userId) : false
  const profile = await getPublicProfile(listing.owner_id)
  const images = [...(listing.listing_images || [])].sort((a, b) => a.sort_order - b.sort_order)
  const cover = coverImageSrc(listing)
  const gallery = images.length > 0 ? images : cover ? [{ id: 'cover', path: '', signed_url: cover, sort_order: 0, is_cover: true }] : []
  const investment = investmentRangeLabel(listing, t, locale)
  const place = [listing.city, listing.country || t.listings.worldwide].filter(Boolean).join(', ')
  const ownerName = profile?.display_name || t.user.unknown

  return (
    <section className="space-y-8 py-8">
      <Link href="/listings" className="text-amber-300">
        <span className="inline-block rtl:rotate-180">←</span> {t.common.backToListings}
      </Link>

      <div className="card !p-0 overflow-hidden">
        {gallery.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {gallery.slice(0, 4).map(image => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={image.id}
                src={listingImageUrl(image) || cover || ''}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
            ))}
          </div>
        ) : null}

        <div className="space-y-6 p-5 sm:p-8">
          <div className="flex flex-wrap gap-3">
            <Badge tone="gold">{opportunityLabel(listing.opportunity_type, t)}</Badge>
            {listing.industry ? <Badge>{industryLabel(listing.industry, t)}</Badge> : null}
            <Badge>{place}</Badge>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-3xl font-bold md:text-4xl">{listing.title}</h1>
            <SaveButton listingId={listing.id} userId={userId} initiallySaved={saved} />
          </div>

          <div>
            <h2 className="mb-3 text-xl font-bold">{t.listings.detailsTitle}</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {investment ? (
                <div>
                  <dt className="text-sm text-slate-400">{t.listings.investmentRange}</dt>
                  <dd className="font-semibold text-amber-200">{investment}</dd>
                </div>
              ) : null}
              {listing.franchise_fee != null ? (
                <div>
                  <dt className="text-sm text-slate-400">{t.listings.franchiseFee}</dt>
                  <dd>{formatMoney(listing.franchise_fee, listing.currency || 'KWD', locale)}</dd>
                </div>
              ) : null}
              {listing.royalty_percent != null ? (
                <div>
                  <dt className="text-sm text-slate-400">{t.listings.royalty}</dt>
                  <dd>{listing.royalty_percent}%</dd>
                </div>
              ) : null}
              {listing.years_in_business != null ? (
                <div>
                  <dt className="text-sm text-slate-400">{t.listings.yearsInBusiness}</dt>
                  <dd>{listing.years_in_business}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="border-t border-slate-700 pt-6">
            <h2 className="mb-4 text-2xl font-bold">{t.listings.aboutTitle}</h2>
            <p className="whitespace-pre-wrap leading-8 text-slate-300">
              {listing.description || t.listings.noDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 pt-6">
            <p className="text-sm text-slate-400">
              {t.listings.listedOn} {formatDate(listing.created_at, locale)}
            </p>
            <Link href={`/u/${listing.owner_id}`} className="text-sm font-semibold text-amber-300">
              {t.listings.viewProfile}: {ownerName}
            </Link>
          </div>
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
