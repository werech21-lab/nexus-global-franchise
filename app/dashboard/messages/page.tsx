
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { copy } from '@/lib/copy'
import { loadUserLabels } from '@/lib/users'

type Conversation = {
  id: string
  listing_id: string | null
  investor_id: string
  owner_id: string
}

type Listing = {
  id: string
  title: string
}

export default function MessagesIndexPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [listings, setListings] = useState<Record<string, string>>({})
  const [labels, setLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true

    async function load() {
      if (!supabase) {
        setMessage(copy.listingForm.configure)
        setLoading(false)
        return
      }

      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.replace('/login?next=/dashboard/messages')
        return
      }

      const currentUserId = authData.user.id
      if (active) setUserId(currentUserId)

      const { data, error } = await supabase
        .from('conversations')
        .select('id,listing_id,investor_id,owner_id')
        .or(`owner_id.eq.${currentUserId},investor_id.eq.${currentUserId}`)
        .order('id', { ascending: false })

      if (!active) return

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      const chats = (data || []) as Conversation[]
      setConversations(chats)

      const listingIds = [...new Set(chats.map(chat => chat.listing_id).filter(Boolean))] as string[]
      if (listingIds.length > 0) {
        const { data: listingRows } = await supabase
          .from('listings')
          .select('id,title')
          .in('id', listingIds)

        const map: Record<string, string> = {}
        ;((listingRows || []) as Listing[]).forEach(listing => {
          map[listing.id] = listing.title
        })
        if (active) setListings(map)
      }

      const otherIds = chats.map(chat =>
        chat.owner_id === currentUserId ? chat.investor_id : chat.owner_id
      )
      const resolved = await loadUserLabels(supabase, otherIds)
      if (active) setLabels(resolved)

      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [router])

  return (
    <section className="space-y-8 py-8">
      <div className="space-y-3">
        <Link href="/dashboard" className="text-amber-300">
          ← {copy.messagesIndex.back}
        </Link>
        <h1 className="text-3xl font-bold">{copy.messagesIndex.title}</h1>
        <p className="text-slate-300">{copy.messagesIndex.intro}</p>
      </div>

      {loading ? (
        <p>{copy.messagesIndex.loading}</p>
      ) : (
        <>
          {message && (
            <p role="status" className="text-amber-300">
              {message}
            </p>
          )}

          {conversations.length === 0 ? (
            <div className="card text-slate-300">{copy.messagesIndex.empty}</div>
          ) : (
            <div className="space-y-4">
              {conversations.map(chat => {
                const otherId =
                  userId && chat.owner_id === userId
                    ? chat.investor_id
                    : chat.owner_id
                const title =
                  (chat.listing_id && listings[chat.listing_id]) ||
                  copy.messagesIndex.unknownListing

                return (
                  <div key={chat.id} className="card flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">{title}</h2>
                      <p className="mt-2 text-sm text-slate-400">
                        {labels[otherId] || otherId}
                      </p>
                    </div>
                    <Link href={`/dashboard/messages/${chat.id}`} className="btn">
                      {copy.messagesIndex.open}
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}
