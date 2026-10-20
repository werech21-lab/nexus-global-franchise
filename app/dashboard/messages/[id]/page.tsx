
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
}

type Conversation = {
  id: string
  listing_id: string
  investor_id: string
  owner_id: string
}

type ReadState = {
  user_id: string
  last_read_at: string
}

export default function ConversationPage() {
  const params = useParams()
  const conversationId = params.id as string

  const [userId, setUserId] = useState('')
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [readStates, setReadStates] = useState<ReadState[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const userIdRef = useRef('')
  const lastMarkedRef = useRef('')
  const markingRef = useRef(false)

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  const loadReadStates = useCallback(async () => {
    if (!supabase || !conversationId) return

    const { data, error: readError } = await supabase
      .from('conversation_reads')
      .select('user_id,last_read_at')
      .eq('conversation_id', conversationId)

    if (!readError && data) {
      setReadStates(data as ReadState[])
    } else if (readError) {
      console.error('Read states:', readError)
    }
  }, [conversationId])

  const markAsRead = useCallback(async () => {
    if (
      !supabase ||
      !conversationId ||
      !userIdRef.current ||
      markingRef.current ||
      document.visibilityState !== 'visible'
    ) {
      return
    }

    const currentUser = userIdRef.current

    const { data: latestMessages, error: latestError } = await supabase
      .from('messages')
      .select('created_at')
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUser)
      .order('created_at', { ascending: false })
      .limit(1)

    if (latestError || !latestMessages?.length) return

    const latestAt = latestMessages[0].created_at

    if (lastMarkedRef.current === latestAt) return

    markingRef.current = true

    try {
      const { error: readError } = await supabase
        .from('conversation_reads')
        .upsert(
          {
            conversation_id: conversationId,
            user_id: currentUser,
            last_read_at: new Date().toISOString()
          },
          { onConflict: 'conversation_id,user_id' }
        )

      if (readError) {
        console.error('Mark as read:', readError)
        return
      }

      lastMarkedRef.current = latestAt
      await loadReadStates()
    } finally {
      markingRef.current = false
    }
  }, [conversationId, loadReadStates])

  const loadMessages = useCallback(async () => {
    if (!supabase || !conversationId) return

    const { data, error: messagesError } = await supabase
      .from('messages')
      .select('id,conversation_id,sender_id,body,created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Messages:', messagesError)
      return
    }

    setMessages((data || []) as Message[])
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return

    let active = true
    lastMarkedRef.current = ''
    userIdRef.current = ''

    async function load() {
      setLoading(true)
      setError('')
      setConversation(null)
      setMessages([])
      setReadStates([])
      setUserId('')

      if (!supabase) {
        if (active) {
          setError('Supabase is not configured.')
          setLoading(false)
        }
        return
      }

      const client = supabase

      const { data: auth, error: authError } =
        await client.auth.getUser()

      if (!active) return

      if (authError || !auth.user) {
        setError('Please sign in to view this conversation.')
        setLoading(false)
        return
      }

      const currentUser = auth.user.id
      userIdRef.current = currentUser
      setUserId(currentUser)

      const { data: chat, error: chatError } = await client
        .from('conversations')
        .select('id,listing_id,investor_id,owner_id')
        .eq('id', conversationId)
        .single()

      if (!active) return

      if (
        chatError ||
        !chat ||
        (chat.owner_id !== currentUser &&
          chat.investor_id !== currentUser)
      ) {
        setError('Conversation not found or access denied.')
        setLoading(false)
        return
      }

      setConversation(chat as Conversation)

      const [messagesResult, readsResult] = await Promise.all([
        client
          .from('messages')
          .select('id,conversation_id,sender_id,body,created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true }),

        client
          .from('conversation_reads')
          .select('user_id,last_read_at')
          .eq('conversation_id', conversationId)
      ])

      if (!active) return

      if (messagesResult.error) {
        setError(messagesResult.error.message)
      } else {
        setMessages((messagesResult.data || []) as Message[])
      }

      if (readsResult.error) {
        console.error('Read states:', readsResult.error)
      } else {
        setReadStates((readsResult.data || []) as ReadState[])
      }

      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [conversationId])

  useEffect(() => {
    if (!conversation || !userId) return

    void markAsRead()

    const onFocus = () => {
      void markAsRead()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void markAsRead()
      }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange
      )
    }
  }, [conversation, userId, markAsRead])

  useEffect(() => {
    if (!supabase || !conversation || !userId) return

    const client = supabase

    const channel = client
      .channel(`nexus-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const incoming = payload.new as Message

          setMessages((current) =>
            current.some((item) => item.id === incoming.id)
              ? current
              : [...current, incoming]
          )

          if (incoming.sender_id !== userIdRef.current) {
            void markAsRead()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_reads',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          void loadReadStates()
        }
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [
    conversationId,
    conversation,
    userId,
    markAsRead,
    loadReadStates
  ])

  useEffect(() => {
    if (!conversation || !userId) return

    const interval = window.setInterval(() => {
      void loadMessages()
      void loadReadStates()
      void markAsRead()
    }, 10000)

    return () => window.clearInterval(interval)
  }, [
    conversation,
    userId,
    loadMessages,
    loadReadStates,
    markAsRead
  ])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    })
  }, [messages.length])

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    if (
      !supabase ||
      !conversation ||
      !userId ||
      !body.trim() ||
      sending
    ) {
      return
    }

    const text = body.trim()

    if (text.length > 5000) {
      setError('Message is too long.')
      return
    }

    setSending(true)
    setError('')

    const { data, error: sendError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        body: text
      })
      .select('id,conversation_id,sender_id,body,created_at')
      .single()

    if (sendError) {
      setError(sendError.message)
    } else {
      setBody('')

      if (data) {
        setMessages((current) =>
          current.some((item) => item.id === data.id)
            ? current
            : [...current, data as Message]
        )
      }
    }

    setSending(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      void sendMessage()
    }
  }

  const otherUserId = conversation
    ? conversation.owner_id === userId
      ? conversation.investor_id
      : conversation.owner_id
    : ''

  const otherReadAt = readStates.find(
    (item) => item.user_id === otherUserId
  )?.last_read_at

  return (
    <section className="mx-auto max-w-4xl space-y-5 px-4 py-8 text-white">
      <Link
        href="/dashboard/inquiries"
        className="text-sm text-amber-300 hover:text-amber-200"
      >
        ← Back to Inquiries
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-[#10213A]">
        <div className="border-b border-slate-700 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700 text-xl">
              💬
            </div>

            <div>
              <h1 className="text-xl font-bold">
                Nexus Secure Messenger
              </h1>
              <p className="text-xs text-slate-400">
                Private conversations inside Nexus Global Franchise
              </p>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Private conversation
          </div>
        </div>

        <div className="border-b border-slate-700 px-5 py-3 text-xs text-slate-400">
          Keep negotiations and agreements on Nexus.
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">
            Loading conversation...
          </div>
        ) : !conversation ? (
          <div className="p-8 text-center text-red-400">
            {error || 'Conversation not found.'}
          </div>
        ) : (
          <>
            <div className="max-h-[500px] min-h-[350px] space-y-4 overflow-y-auto bg-[#09172C] p-5">
              {messages.length === 0 && (
                <p className="py-12 text-center text-sm text-slate-400">
                  No messages yet. Start the conversation.
                </p>
              )}

              {messages.map((item) => {
                const mine = item.sender_id === userId

                const read =
                  mine &&
                  Boolean(
                    otherReadAt &&
                    new Date(otherReadAt).getTime() >=
                      new Date(item.created_at).getTime()
                  )

                return (
                  <div
                    key={item.id}
                    className={
                      mine ? 'flex justify-end' : 'flex justify-start'
                    }
                  >
                    <div
                      className={
                        mine
                          ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-[#E5B866] p-4 text-slate-950'
                          : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-700 p-4 text-white'
                      }
                    >
                      <p
                        className={
                          mine
                            ? 'mb-2 text-xs font-bold text-slate-800'
                            : 'mb-2 text-xs font-bold text-amber-300'
                        }
                      >
                        {mine ? 'You' : 'Other participant'}
                      </p>

                      <p className="whitespace-pre-wrap break-words text-sm">
                        {item.body}
                      </p>

                      <div className="mt-3 flex items-center justify-end gap-3">
                        <span className="text-[10px] opacity-70">
                          {new Date(item.created_at).toLocaleString()}
                        </span>

                        {mine && (
                          <span
                            title={read ? 'Read' : 'Sent'}
                            className={
                              read
                                ? 'flex items-center gap-1 text-xs font-bold text-emerald-800'
                                : 'flex items-center gap-1 text-xs font-semibold text-slate-700'
                            }
                          >
                            <span>{read ? '✓✓' : '✓'}</span>
                            <span>{read ? 'Read' : 'Sent'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={sendMessage}
              className="space-y-3 border-t border-slate-700 p-5"
            >
              <label
                htmlFor="nexus-message"
                className="block text-sm font-semibold"
              >
                Your message
              </label>

              <textarea
                id="nexus-message"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write your message here..."
                maxLength={5000}
                rows={3}
                className="w-full resize-y rounded-xl border border-slate-600 bg-slate-800 p-4 text-sm text-white outline-none focus:border-amber-400"
                required
              />

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Enter to send · Shift + Enter for new line</span>
                <span>{body.length}/5000</span>
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-400">
                  {error}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sending || !body.trim()}
                  className="rounded-xl bg-[#E5B866] px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Message →'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  )
}
