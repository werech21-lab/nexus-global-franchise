'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { useT } from '@/lib/i18n/provider'
import { COUNTRIES, INDUSTRIES, countryLabel } from '@/lib/listings'

export default function ListingsFilters() {
  const t = useT()
  const router = useRouter()
  const params = useSearchParams()

  const [q, setQ] = useState(params.get('q') || '')
  const [country, setCountry] = useState(params.get('country') || '')
  const [industry, setIndustry] = useState(params.get('industry') || '')
  const [investMin, setInvestMin] = useState(params.get('investMin') || '')
  const [investMax, setInvestMax] = useState(params.get('investMax') || '')
  const [sort, setSort] = useState(params.get('sort') || 'newest')

  function apply(event?: FormEvent) {
    event?.preventDefault()
    const next = new URLSearchParams()
    if (q.trim()) next.set('q', q.trim())
    if (country) next.set('country', country)
    if (industry) next.set('industry', industry)
    if (investMin) next.set('investMin', investMin)
    if (investMax) next.set('investMax', investMax)
    if (sort && sort !== 'newest') next.set('sort', sort)
    const query = next.toString()
    router.push(query ? `/listings?${query}` : '/listings')
  }

  return (
    <form onSubmit={apply} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <input
        name="q"
        aria-label={t.listings.search}
        placeholder={t.listings.search}
        value={q}
        onChange={event => setQ(event.target.value)}
      />

      <select aria-label={t.listings.allCountries} value={country} onChange={event => setCountry(event.target.value)}>
        <option value="">{t.listings.allCountries}</option>
        {COUNTRIES.map(item => (
          <option key={item} value={item}>
            {countryLabel(item, t)}
          </option>
        ))}
      </select>

      <select aria-label={t.listings.allIndustries} value={industry} onChange={event => setIndustry(event.target.value)}>
        <option value="">{t.listings.allIndustries}</option>
        {INDUSTRIES.map(item => (
          <option key={item} value={item}>
            {t.industries[item]}
          </option>
        ))}
      </select>

      <input
        type="number"
        min={0}
        inputMode="decimal"
        aria-label={t.listingForm.investmentMinLabel}
        placeholder={t.listingForm.investmentMinLabel}
        value={investMin}
        onChange={event => setInvestMin(event.target.value)}
      />

      <input
        type="number"
        min={0}
        inputMode="decimal"
        aria-label={t.listingForm.investmentMaxLabel}
        placeholder={t.listingForm.investmentMaxLabel}
        value={investMax}
        onChange={event => setInvestMax(event.target.value)}
      />

      <select aria-label={t.listings.sortNewest} value={sort} onChange={event => setSort(event.target.value)}>
        <option value="newest">{t.listings.sortNewest}</option>
        <option value="investment_asc">{t.listings.sortInvestmentAsc}</option>
        <option value="investment_desc">{t.listings.sortInvestmentDesc}</option>
      </select>

      <div className="sm:col-span-2 lg:col-span-3">
        <button type="submit" className="btn w-full sm:w-auto">
          {t.listings.search}
        </button>
      </div>
    </form>
  )
}
