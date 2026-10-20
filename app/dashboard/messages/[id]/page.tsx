
'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
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

export default function ConversationPage() {
  const params = useParams()
  const conversationId = params.id as string

  const [userId, setUserId] = useState('')
  const [conversation, setConversation] =
    useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)

  const addMessage = useCallback((message: Message) => {
    setMessages(current => {
      if (current.some(item => item.id === message.id)) {
        return current
      }

      return [...current, message].sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      )
    })
  }, [])

  const markAsRead = useCallback(
    async (currentUserId: string) => {
      if (!supabase || !conversationId) return

      const { error: readError } = await supabase
        .from('conversation_reads')
        .upsert(
          {
            conversation_id: conversationId,
            user_id: currentUserId,
            last_read_at: new Date().toISOString(),
          },
          {
            onConflict: 'conversation_id,user_id',
          }
        )

      if (readError) {
        console.error('Could not mark conversation as read:', readError)
      }
    },
    [conversationId]
  )

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      setConversation(null)
      setMessages([])
      setUserId('')

      if (!supabase) {
        setError('Supabase is not configured.')
        setLoading(false)
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

      const currentUserId = auth.user.id

      const { data: chat, error: chatError } =
        await client
          .from('conversations')
          .select('id,listing_id,investor_id,owner_id')
          .eq('id', conversationId)
          .single()

      if (!active) return

      if (chatError || !chat) {
        setError('Conversation not found or access denied.')
        setLoading(false)
        return
      }

      const currentConversation = chat as Conversation

      if (
        currentConversation.owner_id !== currentUserId &&
        currentConversation.investor_id !== currentUserId
      ) {
        setError('You do not have access to this conversation.')
        setLoading(false)
        return
      }

      const { data: chatMessages, error: messagesError } =
        await client
          .from('messages')
          .select(
            'id,conversation_id,sender_id,body,created_at'
          )
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })

      if (!active) return

      if (messagesError) {
        setError(messagesError.message)
        setLoading(false)
        return
      }

      setUserId(currentUserId)
      setConversation(currentConversation)
      setMessages((chatMessages || []) as Message[])
      setLoading(false)

      void markAsRead(currentUserId)
    }

    void load()

    return () => {
      active = false
    }
  }, [conversationId, markAsRead])

  useEffect(() => {
    if (!supabase || !conversation || !userId) return

    const client = supabase

    const channel = client
      .channel(`nexus-chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          const incoming = payload.new as Message

          if (incoming.conversation_id !== conversationId) {
            return
          }

          addMessage(incoming)

          if (document.visibilityState === 'visible') {
            void markAsRead(userId)
          }
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
    addMessage,
    markAsRead,
  ])

  useEffect(() => {
    if (!userId || !conversation) return

    const handleFocus = () => {
      void markAsRead(userId)
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [userId, conversation, markAsRead])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages])

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    if (
      !supabase ||
      !conversation ||
      !userId ||
      !body.trim() ||
      sendingRef.current
    ) {
      return
    }

    const text = body.trim()

    if (text.length > 5000) {
      setError('Message is too long.')
      return
    }

    sendingRef.current = true
    setSending(true)
    setError('')

    try {
      const { data, error: sendError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          body: text,
        })
        .select(
          'id,conversation_id,sender_id,body,created_at'
        )
        .single()

      if (sendError) {
        setError(sendError.message)
        return
      }

      setBody(current => current === text ? '' : current)

      if (data) {
        addMessage(data as Message)
      }

      void markAsRead(userId)
    } catch {
      setError('Could not send message. Please try again.')
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()

      if (!sendingRef.current && body.trim()) {
        void sendMessage()
      }
    }
  }

  function formatTime(value: string) {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 px-4 py-8 sm:px-6">
      <Link
        href="/dashboard/inquiries"
        className="inline-flex items-center gap-2 text-sm font-medium text-amber-300 transition hover:text-amber-200"
      >
        ← Back to Inquiries
      </Link>

      <div className="overflow-hidden rounded-3xl border border-slate-700/70 bg-[#111e32] shadow-2xl shadow-black/20">
        <div className="border-b border-slate-700/70 bg-gradient-to-r from-[#152842] to-[#101c30] px-5 py-6 sm:px-7">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-2xl">
              💬
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white sm:text-2xl">
                Nexus Secure Messenger
              </h1>

              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Private conversations inside Nexus Global Franchise
              </p>
            </div>
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Private conversation
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[350px] items-center justify-center px-6 text-sm text-slate-400">
            Loading conversation...
          </div>
        ) : !conversation ? (
          <div className="min-h-[250px] px-6 py-12 text-center text-sm text-red-300">
            {error || 'Conversation not found.'}
          </div>
        ) : (
          <>
            <div className="border-b border-slate-700/60 px-5 py-3 sm:px-7">
              <p className="text-xs text-slate-400">
                Keep negotiations and agreements on Nexus.
              </p>
            </div>

            <div className="h-[420px] space-y-5 overflow-y-auto bg-[#0d192b] px-4 py-6 sm:h-[500px] sm:px-7">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-3 text-4xl">✉️</div>

                  <p className="font-semibold text-white">
                    No messages yet
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Start the conversation below.
                  </p>
                </div>
              )}

              {messages.map(item => {
                const mine = item.sender_id === userId

                return (
                  <div
                    key={item.id}
                    className={`flex ${
                      mine ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${
                        mine
                          ? 'rounded-br-md bg-[#dfb66c] text-slate-950'
                          : 'rounded-bl-md border border-slate-600/50 bg-[#243650] text-white'
                      }`}
                    >
                      <p
                        className={`mb-2 text-[11px] font-semibold ${
                          mine
                            ? 'text-slate-800'
                            : 'text-amber-300'
                        }`}
                      >
                        {mine ? 'You' : 'Other participant'}
                      </p>

                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {item.body}
                      </p>

                      <p
                        className={`mt-2 text-right text-[10px] ${
                          mine
                            ? 'text-slate-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {formatTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}

              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={sendMessage}
              className="border-t border-slate-700/70 bg-[#111e32] p-4 sm:p-6"
            >
              <label
                htmlFor="message"
                className="mb-3 block text-sm font-semibold text-white"
              >
                Your message
              </label>

              <textarea
                id="message"
                value={body}
                onChange={event => setBody(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write your message here..."
                maxLength={5000}
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-600 bg-[#182940] px-4 py-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
                required
              />

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>
                  Enter to send · Shift + Enter for new line
                </span>

                <span>{body.length}/5000</span>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                >
                  {error}
                </p>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={sending || !body.trim()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#dfb66c] px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>
                    {sending ? 'Sending...' : 'Send Message'}
                  </span>
                  <span aria-hidden="true">➤</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  )
}
