import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import PageShell from '@/components/ui/PageShell'
import ListingCard from '@/components/listings/ListingCard'
import EmptyState from '@/components/ui/EmptyState'
import {
  getPublicProfile,
  getPublishedListingsByOwner,
} from '@/features/listings/queries'
import { getDictionary, getRequestLocale } from '@/lib/i18n/dictionary'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const locale = await getRequestLocale()
  const t = await getDictionary(locale)
  const profile = await getPublicProfile(id)
  const name = profile?.display_name || t.user.unknown
  return pageMetadata(name, profile?.bio || t.profile.meta, `/u/${id}`, locale)
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params
  const t = await getDictionary()
  const profile = await getPublicProfile(id)
  const listings = await getPublishedListingsByOwner(id)

  if (!profile && listings.length === 0) notFound()

  const name = profile?.display_name || t.user.unknown

  return (
    <PageShell title={name} intro={profile?.bio || t.profile.meta}>
      {profile?.avatar && (profile.avatar.startsWith('http://') || profile.avatar.startsWith('https://')) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar}
          alt=""
          className="h-24 w-24 rounded-full object-cover"
        />
      ) : null}
      <p className="text-sm text-slate-400">{t.profile.title}</p>
      <h2 className="text-2xl font-bold">{t.profile.listings}</h2>
      {listings.length === 0 ? (
        <EmptyState title={t.profile.emptyListings} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
      <Link href="/listings" className="text-amber-300">
        {t.common.backToListings}
      </Link>
    </PageShell>
  )
}
