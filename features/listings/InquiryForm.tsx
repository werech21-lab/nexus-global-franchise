'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n/provider'
import Alert from '@/components/ui/Alert'
import type { Listing } from '@/types/listing'

export default function InquiryForm({
  listing,
  userId,
  alreadyInquired: initialAlreadyInquired,
}: {
  listing: Listing
  userId: string | null
  alreadyInquired: boolean
}) {
  const t = useT()
  const [inquiryMessage, setInquiryMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [inquiryResult, setInquiryResult] = useState('')
  const [inquirySent, setInquirySent] = useState(false)
  const [alreadyInquired, setAlreadyInquired] = useState(initialAlreadyInquired)

  const isOwner = Boolean(userId && userId === listing.owner_id)

  async function sendInquiry() {
    if (!supabase || sending || inquirySent || alreadyInquired) return

    const message = inquiryMessage.trim()

    if (message.length < 10) {
      setInquiryResult(t.listings.messageMin)
      return
    }

    if (message.length > 2000) {
      setInquiryResult(t.listings.messageMax)
      return
    }

    setSending(true)
    setInquiryResult('')

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        setInquiryResult(t.common.signInFirst)
        return
      }

      const investorId = authData.user.id

      if (investorId === listing.owner_id) {
        setInquiryResult(t.listings.cannotInquireOwn)
        return
      }

      const { error: insertError } = await supabase.from('inquiries').insert({
        listing_id: listing.id,
        investor_id: investorId,
        message,
        status: 'pending',
      })

      if (insertError) {
        if (insertError.code === '23505') {
          setAlreadyInquired(true)
          setInquiryResult('')
          return
        }

        if (insertError.code === '23514') {
          setInquiryResult(t.listings.messageLength)
          return
        }

        throw insertError
      }

      setInquirySent(true)
      setInquiryMessage('')
      setInquiryResult(t.listings.sent)
    } catch (err) {
      console.error('Inquiry submission error:', err)
      setInquiryResult(
        err instanceof Error ? err.message : t.listings.sendFailed
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-2xl font-bold">{t.listings.interestTitle}</h2>
      <p className="text-slate-300">{t.listings.interestIntro}</p>

      {!userId ? (
        <Link href="/login" className="btn">
          {t.listings.signInToContinue}
        </Link>
      ) : isOwner ? (
        <p className="text-amber-300">{t.listings.ownListing}</p>
      ) : alreadyInquired ? (
        <Alert tone="warning" role="status">
          <p className="font-bold">{t.listings.alreadyTitle}</p>
          <p className="mt-2">{t.listings.alreadyBody}</p>
        </Alert>
      ) : inquirySent ? (
        <Alert tone="success" role="status">
          {t.listings.sent}
        </Alert>
      ) : (
        <div className="space-y-4">
          <label htmlFor="inquiry-message" className="block font-semibold">
            {t.listings.messageLabel}
          </label>

          <textarea
            id="inquiry-message"
            className="w-full rounded-lg border border-slate-600 bg-slate-900 p-4 text-white outline-none focus:border-amber-400"
            rows={5}
            minLength={10}
            maxLength={2000}
            placeholder={t.listings.messagePlaceholder}
            value={inquiryMessage}
            onChange={event => {
              setInquiryMessage(event.target.value)
              setInquiryResult('')
            }}
          />

          <p className="text-sm text-slate-400">{t.listings.messageHint}</p>

          <button
            type="button"
            className="btn"
            onClick={() => void sendInquiry()}
            disabled={sending || inquiryMessage.trim().length < 10}
          >
            {sending ? t.listings.sending : t.listings.send}
          </button>

          {inquiryResult ? (
            <p role="status" className="text-amber-300">
              {inquiryResult}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
