
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Listing = {
  id: string
  title: string
  description: string | null
  country: string | null
  opportunity_type: string | null
}

export default function Listings() {
  const [items, setItems] = useState<Listing[]>([])
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('all')
  const [type, setType] = useState('all')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setMessage('Supabase is not configured.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('listings')
        .select('id,title,description,country,opportunity_type')
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (error) {
        setMessage(error.message)
      } else {
        setItems(data || [])
      }

      setLoading(false)
    }

    load()
  }, [])

  const countries = useMemo(
    () => [...new Set(items.map(x => x.country).filter(Boolean))] as string[],
    [items]
  )

  const types = useMemo(
    () => [...new Set(items.map(x => x.opportunity_type).filter(Boolean))] as string[],
    [items]
  )

  const filtered = items.filter(x => {
    const term = search.toLowerCase()
    const matchesSearch =
      (x.title || '').toLowerCase().includes(term) ||
      (x.description || '').toLowerCase().includes(term) ||
      (x.country || '').toLowerCase().includes(term)

    return (
      matchesSearch &&
      (country === 'all' || x.country === country) &&
      (type === 'all' || x.opportunity_type === type)
    )
  })

  return (
    <section className="space-y-8 py-6">
      <div className="space-y-3">
        <p className="text-amber-300 uppercase tracking-widest text-sm">
          Global Business Marketplace
        </p>

        <h1 className="text-4xl font-bold">
          Explore Opportunities
        </h1>

        <p className="text-slate-300">
          Discover franchises, businesses for sale and
          strategic partnerships around the world.
        </p>
      </div>

      <div className="card grid gap-4 md:grid-cols-3">
        <input
          placeholder="Search opportunities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
        >
          <option value="all">All Countries</option>
          {countries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={type}
          onChange={e => setType(e.target.value)}
        >
          <option value="all">All Opportunity Types</option>
          {types.map(t => (
            <option key={t} value={t}>
              {t.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading opportunities...</p>
      ) : message ? (
        <p className="text-amber-300">{message}</p>
      ) : (
        <>
          <p className="text-slate-400">
            {filtered.length} opportunities found
          </p>

          {filtered.length === 0 && (
            <div className="card">
              No matching opportunities found.
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(x => (
              <Link
                href={`/listings/${x.id}`}
                key={x.id}
                className="card block transition hover:border-amber-400 hover:-translate-y-1"
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300">
                    {(x.opportunity_type || 'Opportunity').replaceAll('_', ' ')}
                  </span>

                  <span className="rounded-full bg-slate-700 px-3 py-1 text-xs">
                    {x.country || 'Worldwide'}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-white">
                  {x.title}
                </h2>

                <p className="mt-3 text-sm text-slate-300 line-clamp-3">
                  {x.description || 'Explore this business opportunity.'}
                </p>

                <div className="mt-6 border-t border-slate-700 pt-4 font-semibold text-amber-300">
                  View Opportunity →
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
