'use client'

import { useMemo, useState } from 'react'
import ListingCard from '@/components/listings/ListingCard'
import EmptyState from '@/components/ui/EmptyState'
import { useT } from '@/lib/i18n/provider'
import { interpolate } from '@/lib/i18n'
import { opportunityLabel, type ListingSummary } from '@/lib/listings'

export default function ListingsExplorer({
  listings,
}: {
  listings: ListingSummary[]
}) {
  const t = useT()
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('all')
  const [type, setType] = useState('all')

  const countries = useMemo(
    () => [...new Set(listings.map(item => item.country).filter(Boolean))] as string[],
    [listings]
  )

  const types = useMemo(
    () =>
      [...new Set(listings.map(item => item.opportunity_type).filter(Boolean))] as string[],
    [listings]
  )

  const filtered = listings.filter(item => {
    const term = search.toLowerCase()
    const matchesSearch =
      (item.title || '').toLowerCase().includes(term) ||
      (item.description || '').toLowerCase().includes(term) ||
      (item.country || '').toLowerCase().includes(term)

    return (
      matchesSearch &&
      (country === 'all' || item.country === country) &&
      (type === 'all' || item.opportunity_type === type)
    )
  })

  return (
    <div className="space-y-6">
      <div className="card grid gap-4 md:grid-cols-3">
        <input
          placeholder={t.listings.search}
          value={search}
          onChange={event => setSearch(event.target.value)}
        />

        <select
          value={country}
          onChange={event => setCountry(event.target.value)}
        >
          <option value="all">{t.listings.allCountries}</option>
          {countries.map(item => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select value={type} onChange={event => setType(event.target.value)}>
          <option value="all">{t.listings.allTypes}</option>
          {types.map(item => (
            <option key={item} value={item}>
              {opportunityLabel(item, t)}
            </option>
          ))}
        </select>
      </div>

      <p className="text-slate-400">
        {interpolate(t.listings.found, { count: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <EmptyState title={t.listings.empty} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
