
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLocale, useT } from '@/lib/i18n/provider'
import { formatDate } from '@/lib/format'
import EmptyState from '@/components/ui/EmptyState'
import { loadUserLabels } from '@/lib/users'

type Inquiry = {
  id: string
  listing_id: string
  investor_id: string
  message: string | null
  status: string
  created_at: string
}

type Listing = {
  id: string
  title: string
}

type Conversation = {
  id: string
  inquiry_id: string
}

export default function InvestorInquiries() {
  const t = useT()
  const locale = useLocale()
  const router = useRouter()

  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [conversations, setConversations] = useState<
    Conversation[]
  >([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(
    null
  )
  const [investorLabels, setInvestorLabels] = useState<
    Record<string, string>
  >({})

  const load = useCallback(async () => {
    if (!supabase) {
      setMessage(t.common.supabase)
      setLoading(false)
      return
    }

    setLoading(true)
    setMessage('')

    const client = supabase

    const { data: authData, error: authError } =
      await client.auth.getUser()

    if (authError || !authData.user) {
      setMessage(t.common.signInFirst)
      setLoading(false)
      return
    }

    const { data: owned, error: listingError } =
      await client
        .from('listings')
        .select('id,title')
        .eq('owner_id', authData.user.id)

    if (listingError) {
      setMessage(listingError.message)
      setLoading(false)
      return
    }

    const ownedListings = (owned || []) as Listing[]
    setListings(ownedListings)

    if (ownedListings.length === 0) {
      setInquiries([])
      setConversations([])
      setLoading(false)
      return
    }

    const ids = ownedListings.map(item => item.id)

    const { data, error } = await client
      .from('inquiries')
      .select(
        'id,listing_id,investor_id,message,status,created_at'
      )
      .in('listing_id', ids)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const loadedInquiries = (data || []) as Inquiry[]
    setInquiries(loadedInquiries)

    const labels = await loadUserLabels(
      client,
      loadedInquiries.map(item => item.investor_id),
      t.user
    )
    setInvestorLabels(labels)

    if (loadedInquiries.length > 0) {
      const { data: chats, error: chatsError } =
        await client
          .from('conversations')
          .select('id,inquiry_id')
          .in(
            'inquiry_id',
            loadedInquiries.map(item => item.id)
          )

      if (chatsError) {
        setMessage(chatsError.message)
      } else {
        setConversations(
          (chats || []) as Conversation[]
        )
      }
    } else {
      setConversations([])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function acceptAndOpenChat(id: string) {
    if (!supabase || updatingId) return

    setUpdatingId(id)
    setMessage('')

    try {
      const { data, error } = await supabase.rpc(
        'accept_inquiry',
        { p_inquiry_id: id }
      )

      if (error) {
        throw error
      }

      if (typeof data !== 'string' || !data) {
        throw new Error(
          t.inquiries.acceptFailed
        )
      }

      setInquiries(current =>
        current.map(item =>
          item.id === id
            ? { ...item, status: 'contacted' }
            : item
        )
      )

      setConversations(current => {
        const filtered = current.filter(
          item => item.inquiry_id !== id
        )

        return [
          ...filtered,
          { id: data, inquiry_id: id }
        ]
      })

      router.push(`/dashboard/messages/${data}`)
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t.inquiries.openFailed
      )
    } finally {
      setUpdatingId(null)
    }
  }

  async function closeInquiry(id: string) {
    if (!supabase || updatingId) return

    setUpdatingId(id)
    setMessage('')

    const { data, error } = await supabase
      .from('inquiries')
      .update({ status: 'closed' })
      .eq('id', id)
      .select('id,status')
      .single()

    if (error) {
      setMessage(error.message)
    } else if (data) {
      setInquiries(current =>
        current.map(item =>
          item.id === id
            ? { ...item, status: data.status }
            : item
        )
      )

      setMessage(t.inquiries.closedOk)
    }

    setUpdatingId(null)
  }

  const getListingTitle = (id: string) =>
    listings.find(item => item.id === id)?.title ||
    t.inquiries.unknownListing

  const pending = inquiries.filter(
    item =>
      item.status === 'pending' ||
      item.status === 'new'
  ).length

  const contacted = inquiries.filter(
    item => item.status === 'contacted'
  ).length

  return (
    <section className="space-y-8 py-8">
      <div className="space-y-3">
        <Link
          href="/dashboard"
          className="text-amber-300"
        >
          <span className="inline-block rtl:rotate-180">←</span> {t.common.backToDashboard}
        </Link>

        <h1 className="text-3xl font-bold">
          {t.inquiries.title}
        </h1>

        <p className="text-slate-300">
          {t.inquiries.intro}
        </p>
      </div>

      {loading ? (
        <p>{t.inquiries.loading}</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card">
              <p className="text-slate-400">
                {t.inquiries.total}
              </p>
              <p className="text-3xl font-bold">
                {inquiries.length}
              </p>
            </div>

            <div className="card">
              <p className="text-slate-400">
                {t.inquiries.pending}
              </p>
              <p className="text-3xl font-bold text-amber-300">
                {pending}
              </p>
            </div>

            <div className="card">
              <p className="text-slate-400">
                {t.inquiries.contacted}
              </p>
              <p className="text-3xl font-bold text-green-400">
                {contacted}
              </p>
            </div>
          </div>

          {message && (
            <p
              role="status"
              className="text-amber-300"
            >
              {message}
            </p>
          )}

          {inquiries.length === 0 && (
            <div className="card">
              <EmptyState title={t.inquiries.empty} />
            </div>
          )}

          <div className="space-y-4">
            {inquiries.map(inquiry => {
              const chat = conversations.find(
                item =>
                  item.inquiry_id === inquiry.id
              )

              return (
                <div
                  key={inquiry.id}
                  className="card space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">
                        {getListingTitle(
                          inquiry.listing_id
                        )}
                      </h2>

                      <p className="mt-2 text-sm text-slate-400">
                        {t.inquiries.received}:{' '}
                        {formatDate(inquiry.created_at, locale)}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {t.inquiries.investor}:{' '}
                        {investorLabels[inquiry.investor_id] ||
                          inquiry.investor_id}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-700 px-4 py-2 text-sm">
                      {inquiry.status}
                    </span>
                  </div>

                  <div className="border-t border-slate-700 pt-4">
                    <p className="whitespace-pre-wrap text-slate-300">
                      {inquiry.message ||
                        t.inquiries.noMessage}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {chat ? (
                      <Link
                        href={
                          `/dashboard/messages/${chat.id}`
                        }
                        className="btn"
                      >
                        {t.inquiries.openConversation}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="btn"
                        disabled={updatingId !== null}
                        onClick={() =>
                          acceptAndOpenChat(inquiry.id)
                        }
                      >
                        {updatingId === inquiry.id
                          ? t.inquiries.opening
                          : t.inquiries.accept}
                      </button>
                    )}

                    {inquiry.status !== 'closed' && (
                      <button
                        type="button"
                        className="rounded-lg border border-slate-600 px-4 py-2"
                        disabled={updatingId !== null}
                        onClick={() =>
                          closeInquiry(inquiry.id)
                        }
                      >
                        {t.inquiries.closeInquiry}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
