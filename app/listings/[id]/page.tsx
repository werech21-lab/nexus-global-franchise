
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
  owner_id: string
}

export default function ListingDetails() {
  const params = useParams()
  const id = params.id as string

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [inquiryMessage, setInquiryMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [inquiryResult, setInquiryResult] = useState('')
  const [inquirySent, setInquirySent] = useState(false)
  const [alreadyInquired, setAlreadyInquired] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setAuthLoading(true)
      setError('')
      setListing(null)
      setInquirySent(false)
      setAlreadyInquired(false)
      setInquiryResult('')

      if (!supabase) {
        if (active) {
          setError('Supabase is not configured.')
          setLoading(false)
          setAuthLoading(false)
        }
        return
      }

      const client = supabase

      const { data: authData } = await client.auth.getUser()

      if (!active) return

      const currentUserId = authData.user?.id || null
      setUserId(currentUserId)
      setAuthLoading(false)

      const { data, error: fetchError } = await client
        .from('listings')
        .select(
          'id,title,description,country,opportunity_type,created_at,owner_id'
        )
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle()

      if (!active) return

      if (fetchError) {
        setError(fetchError.message)
      } else if (!data) {
        setError('Opportunity not found.')
      } else {
        setListing(data)

        if (currentUserId && currentUserId !== data.owner_id) {
          const { data: existingInquiry, error: checkError } =
            await client
              .from('inquiries')
              .select('id')
              .eq('listing_id', data.id)
              .eq('investor_id', currentUserId)
              .limit(1)
              .maybeSingle()

          if (!active) return

          if (!checkError && existingInquiry) {
            setAlreadyInquired(true)
          }
        }
      }

      if (active) {
        setLoading(false)
      }
    }

    if (id) {
      load()
    } else {
      setError('Invalid opportunity ID.')
      setLoading(false)
      setAuthLoading(false)
    }

    return () => {
      active = false
    }
  }, [id])

  async function sendInquiry() {
    if (
      !supabase ||
      !listing ||
      sending ||
      inquirySent ||
      alreadyInquired
    ) {
      return
    }

    const message = inquiryMessage.trim()

    if (!message) {
      setInquiryResult('Please enter your message.')
      return
    }

    setSending(true)
    setInquiryResult('')

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError || !authData.user) {
        setInquiryResult('Please sign in first.')
        return
      }

      const investorId = authData.user.id

      if (investorId === listing.owner_id) {
        setInquiryResult(
          'You cannot send an inquiry to your own opportunity.'
        )
        return
      }

      const { error: insertError } = await supabase
        .from('inquiries')
        .insert({
          listing_id: listing.id,
          investor_id: investorId,
          message,
          status: 'pending'
        })

      if (insertError) {
        if (
          insertError.code === '23505' ||
          insertError.message.includes(
            'inquiries_listing_id_investor_id_key'
          )
        ) {
          setAlreadyInquired(true)
          setInquiryResult('')
          return
        }

        throw insertError
      }

      setInquirySent(true)
      setInquiryMessage('')
      setInquiryResult('Your inquiry was sent successfully!')
    } catch (err) {
      console.error('Inquiry submission error:', err)

      setInquiryResult(
        err instanceof Error
          ? err.message
          : 'Failed to send inquiry. Please try again.'
      )
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <p className="py-12">
        Loading opportunity...
      </p>
    )
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

  const isOwner = userId === listing.owner_id

  return (
    <section className="space-y-8 py-8">
      <Link
        href="/listings"
        className="text-amber-300"
      >
        ← Back to Opportunities
      </Link>

      <div className="card space-y-6">
        <div className="flex flex-wrap gap-3">
          <span className="rounded-full bg-amber-500/15 px-4 py-2 text-amber-300">
            {(listing.opportunity_type || 'Opportunity')
              .replaceAll('_', ' ')}
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
            Listed on{' '}
            {new Date(listing.created_at)
              .toLocaleDateString('en-US')}
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

        {authLoading ? (
          <p className="text-slate-400">
            Checking your account...
          </p>
        ) : !userId ? (
          <Link href="/login" className="btn">
            Sign In to Continue
          </Link>
        ) : isOwner ? (
          <p className="text-amber-300">
            This is your opportunity.
            You cannot send an inquiry to yourself.
          </p>
        ) : alreadyInquired ? (
          <div
            role="status"
            className="rounded-lg border border-amber-600 bg-amber-900/20 p-4 text-amber-300"
          >
            <p className="font-bold">
              Inquiry Already Submitted
            </p>

            <p className="mt-2">
              You have already sent an inquiry for this
              opportunity. The owner can review your request.
            </p>
          </div>
        ) : inquirySent ? (
          <div
            role="status"
            className="rounded-lg border border-green-700 bg-green-900/20 p-4 text-green-400"
          >
            Your inquiry was sent successfully!
          </div>
        ) : (
          <div className="space-y-4">
            <label
              htmlFor="inquiry-message"
              className="block font-semibold"
            >
              Your Message
            </label>

            <textarea
              id="inquiry-message"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 p-4 text-white outline-none focus:border-amber-400"
              rows={5}
              maxLength={2000}
              placeholder="Hello, I am interested in this investment opportunity. I would like to learn more..."
              value={inquiryMessage}
              onChange={(e) =>
                setInquiryMessage(e.target.value)
              }
            />

            <button
              type="button"
              className="btn"
              onClick={sendInquiry}
              disabled={sending || !inquiryMessage.trim()}
            >
              {sending ? 'Sending...' : 'Send Inquiry'}
            </button>

            {inquiryResult && (
              <p
                role="status"
                className="text-amber-300"
              >
                {inquiryResult}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
