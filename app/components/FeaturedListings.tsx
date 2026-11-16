
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { copy } from '@/lib/copy'
import type { ListingSummary } from '@/lib/listings'
import ListingCard from './ListingCard'

export default function FeaturedListings() {
  const [items, setItems] = useState<ListingSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      if (!supabase) {
        if (active) setLoading(false)
        return
      }

      const { data } = await supabase
        .from('listings')
        .select('id,title,description,country,opportunity_type,created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3)

      if (active) {
        setItems((data || []) as ListingSummary[])
        setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="space-y-5 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">{copy.home.featuredTitle}</h2>
          <p className="mt-2 text-slate-300">{copy.home.featuredIntro}</p>
        </div>
        <Link href="/listings" className="text-sm font-semibold">
          {copy.home.viewAll} →
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-400">{copy.listings.loading}</p>
      ) : items.length === 0 ? (
        <div className="card text-slate-300">{copy.home.featuredEmpty}</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </section>
  )
}
