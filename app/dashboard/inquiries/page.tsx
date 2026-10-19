
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

  const load = useCallback(async () => {
    if (!supabase) {
      setMessage('Supabase is not configured.')
      setLoading(false)
      return
    }

    setLoading(true)
    setMessage('')

    const client = supabase

    const { data: authData, error: authError } =
      await client.auth.getUser()

    if (authError || !authData.user) {
      setMessage('Please sign in to view inquiries.')
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
          'Conversation could not be created.'
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
          : 'Unable to open conversation.'
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

      setMessage('Inquiry closed successfully.')
    }

    setUpdatingId(null)
  }

  const getListingTitle = (id: string) =>
    listings.find(item => item.id === id)?.title ||
    'Unknown opportunity'

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
          ← Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold">
          Investor Inquiries
        </h1>

        <p className="text-slate-300">
          Manage investor interest and secure
          conversations.
        </p>
      </div>

      {loading ? (
        <p>Loading inquiries...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card">
              <p className="text-slate-400">
                Total Inquiries
              </p>
              <p className="text-3xl font-bold">
                {inquiries.length}
              </p>
            </div>

            <div className="card">
              <p className="text-slate-400">
                Pending
              </p>
              <p className="text-3xl font-bold text-amber-300">
                {pending}
              </p>
            </div>

            <div className="card">
              <p className="text-slate-400">
                Contacted
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
              <p className="text-slate-300">
                No investor inquiries yet.
              </p>
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
                        Received:{' '}
                        {new Date(
                          inquiry.created_at
                        ).toLocaleDateString('en-US')}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        Investor ID:{' '}
                        {inquiry.investor_id}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-700 px-4 py-2 text-sm">
                      {inquiry.status}
                    </span>
                  </div>

                  <div className="border-t border-slate-700 pt-4">
                    <p className="whitespace-pre-wrap text-slate-300">
                      {inquiry.message ||
                        'No message provided.'}
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
                        Open Conversation
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
                          ? 'Opening...'
                          : 'Accept & Open Chat'}
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
                        Close Inquiry
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
