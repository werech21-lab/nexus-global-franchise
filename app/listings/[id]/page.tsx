
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Listing = {
  id: string
  title: string
  description: string | null
  country: string | null
  opportunity_type: string | null
  created_at: string
}

export default function ListingDetails() {
  const params = useParams()
  const id = params.id as string

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setError('Supabase is not configured.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('listings')
        .select('id,title,description,country,opportunity_type,created_at')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle()

      if (error) {
        setError(error.message)
      } else if (!data) {
        setError('Opportunity not found.')
      } else {
        setListing(data)
      }

      setLoading(false)
    }

    if (id) load()
  }, [id])

  if (loading) {
    return <p className="py-12">Loading opportunity...</p>
  }

  if (error || !listing) {
    return (
      <div className="space-y-5 py-12">
        <h1 className="text-2xl font-bold">
          {error || 'Opportunity not found.'}
        </h1>
        <Link href="/listings" className="btn">
          Back to Opportunities
        </Link>
      </div>
    )
  }

  return (
    <section className="space-y-8 py-8">
      <Link href="/listings" className="text-amber-300">
        ← Back to Opportunities
      </Link>

      <div className="card space-y-6">
        <div className="flex flex-wrap gap-3">
          <span className="rounded-full bg-amber-500/15 px-4 py-2 text-amber-300">
            {(listing.opportunity_type || 'Opportunity').replaceAll('_', ' ')}
          </span>

          <span className="rounded-full bg-slate-700 px-4 py-2">
            {listing.country || 'Worldwide'}
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold">
          {listing.title}
        </h1>

        <div className="border-t border-slate-700 pt-6">
          <h2 className="mb-4 text-2xl font-bold">
            About This Opportunity
          </h2>

          <p className="whitespace-pre-wrap leading-8 text-slate-300">
            {listing.description || 'No description available.'}
          </p>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <p className="text-sm text-slate-400">
            Listed on {new Date(listing.created_at).toLocaleDateString('en-US')}
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-2xl font-bold">
          Interested in this opportunity?
        </h2>

        <p className="text-slate-300">
          Connect with business owners and explore
          potential investment opportunities.
        </p>

        <Link href="/login" className="btn">
          Sign In to Continue
        </Link>
      </div>
    </section>
  )
}

const [inquiryMessage, setInquiryMessage] = useState('')
const [sending, setSending] = useState(false)
const [inquiryResult, setInquiryResult] = useState('')

