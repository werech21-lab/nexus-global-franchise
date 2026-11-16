'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n/provider'
import EmptyState from '@/components/ui/EmptyState'
import ListingCard from '@/components/listings/ListingCard'
import type { ListingSummary } from '@/types/listing'
import { signListingRecords } from '@/lib/listing-images'

export default function SavedListingsPage() {
  const t = useT()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [listings, setListings] = useState<ListingSummary[]>([])

  useEffect(() => {
    let active = true

    async function load() {
      if (!supabase) {
        setMessage(t.common.supabase)
        setLoading(false)
        return
      }

      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.replace('/login?next=/dashboard/saved')
        return
      }

      const { data, error } = await supabase
        .from('saved_listings')
        .select(
          'created_at,listing:listings(id,title,description,country,city,opportunity_type,industry,investment_min,investment_max,franchise_fee,royalty_percent,years_in_business,currency,created_at,listing_images(id,path,sort_order,is_cover))'
        )
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })

      if (!active) return

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      const rows = (data || [])
        .map(row => {
          const listing = (row as { listing?: ListingSummary | ListingSummary[] | null }).listing
          if (Array.isArray(listing)) return listing[0]
          return listing || null
        })
        .filter(Boolean) as ListingSummary[]

      const signed = await signListingRecords(supabase, rows)
      if (active) setListings(signed)
      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [router, t.common.supabase])

  return (
    <section className="space-y-8 py-8">
      <div className="space-y-3">
        <Link href="/dashboard" className="text-amber-300">
          <span className="inline-block rtl:rotate-180">←</span> {t.common.backToDashboard}
        </Link>
        <h1 className="text-3xl font-bold">{t.saved.title}</h1>
        <p className="text-slate-300">{t.saved.intro}</p>
      </div>

      {loading ? (
        <p>{t.saved.loading}</p>
      ) : (
        <>
          {message ? <p role="status" className="text-amber-300">{message}</p> : null}
          {listings.length === 0 ? (
            <EmptyState title={t.saved.empty} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
