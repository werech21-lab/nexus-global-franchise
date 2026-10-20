
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

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

type TypingPayload = {
  userId: string
  typing: boolean
}

export default function ConversationPage() {
  const params = useParams()
  const conversationId = params.id as string

  const [userId, setUserId] = useState('')
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [otherTyping, setOtherTyping] = useState(false)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const typingRef = useRef(false)

  const addMessages = useCallback((items: Message[]) => {
    setMessages(current => {
      const combined = new Map<string, Message>()

      for (const item of current) {
        combined.set(item.id, item)
      }

      for (const item of items) {
        combined.set(item.id, item)
      }

      return Array.from(combined.values()).sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      )
    })
  }, [])

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

      const { data: chat, error: chatError } = await client
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

      const currentUserId = auth.user.id
      const currentChat = chat as Conversation

      if (
        currentChat.owner_id !== currentUserId &&
        currentChat.investor_id !== currentUserId
      ) {
        setError('You do not have access to this conversation.')
        setLoading(false)
        return
      }

      const { data: chatMessages, error: messagesError } =
        await client
          .from('messages')
          .select('id,conversation_id,sender_id,body,created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })

      if (!active) return

      setUserId(currentUserId)
      setConversation(currentChat)

      if (messagesError) {
        setError(messagesError.message)
      } else {
        setMessages((chatMessages || []) as Message[])
      }

      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [conversationId])

  useEffect(() => {
    if (!supabase || !conversation || !userId) return

    const client = supabase
    let active = true

    const channel = client
      .channel(`nexus-chat-${conversationId}`, {
        config: {
          broadcast: {
            self: false
          }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        payload => {
          const incoming = payload.new as Message

          if (incoming.conversation_id === conversationId) {
            addMessages([incoming])
          }
        }
      )
      .on(
        'broadcast',
        { event: 'typing' },
        ({ payload }) => {
          const data = payload as TypingPayload

          if (!data || data.userId === userId) return

          setOtherTyping(data.typing)

          if (remoteTypingTimerRef.current) {
            clearTimeout(remoteTypingTimerRef.current)
          }

          if (data.typing) {
            remoteTypingTimerRef.current = setTimeout(() => {
              setOtherTyping(false)
            }, 3000)
          }
        }
      )
      .on(
        'broadcast',
        { event: 'new-message' },
        ({ payload }) => {
          const incoming = payload as Message

          if (
            incoming &&
            incoming.conversation_id === conversationId
          ) {
            addMessages([incoming])
          }
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED' && active) {
          void refreshMessages()
        }
      })

    channelRef.current = channel

    async function refreshMessages() {
      const { data, error: refreshError } = await client
        .from('messages')
        .select('id,conversation_id,sender_id,body,created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (!active) return

      if (!refreshError && data) {
        addMessages(data as Message[])
      }
    }

    const refreshOnFocus = () => {
      void refreshMessages()
    }

    window.addEventListener('focus', refreshOnFocus)

    return () => {
      active = false

      window.removeEventListener('focus', refreshOnFocus)

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }

      if (remoteTypingTimerRef.current) {
        clearTimeout(remoteTypingTimerRef.current)
      }

      typingRef.current = false
      channelRef.current = null

      void client.removeChannel(channel)
    }
  }, [conversationId, conversation, userId, addMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end'
    })
  }, [messages.length, otherTyping])

  const broadcastTyping = useCallback(
    (typing: boolean) => {
      if (!userId || !channelRef.current) return

      void channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId,
          typing
        }
      })
    },
    [userId]
  )

  function stopTyping() {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }

    if (typingRef.current) {
      typingRef.current = false
      broadcastTyping(false)
    }
  }

  function handleTyping(value: string) {
    setBody(value)

    if (!value.trim()) {
      stopTyping()
      return
    }

    if (!typingRef.current) {
      typingRef.current = true
      broadcastTyping(true)
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
    }

    typingTimerRef.current = setTimeout(() => {
      typingRef.current = false
      broadcastTyping(false)
    }, 1800)
  }

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
      stopTyping()

      if (data) {
        const savedMessage = data as Message

        addMessages([savedMessage])

        if (channelRef.current) {
          void channelRef.current.send({
            type: 'broadcast',
            event: 'new-message',
            payload: savedMessage
          })
        }
      }
    }

    setSending(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()

      if (!sending && body.trim()) {
        void sendMessage()
      }
    }
  }

  const isOwner = conversation?.owner_id === userId

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/dashboard/inquiries"
        className="mb-4 inline-block text-sm font-medium text-amber-300 hover:text-amber-200"
      >
        ← Back to Inquiries
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-[#102039] text-white shadow-xl">
        <header className="border-b border-slate-700 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700 text-xl">
              💬
            </div>

            <div>
              <h1 className="text-xl font-bold">
                Nexus Secure Messenger
              </h1>

              <p className="mt-1 text-xs text-slate-400">
                Private conversations inside Nexus Global Franchise
              </p>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/30 px-3 py-1 text-xs text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Private conversation
          </div>
        </header>

        {loading ? (
          <div className="p-10 text-center text-slate-400">
            Loading conversation...
          </div>
        ) : !conversation ? (
          <div className="p-8 text-red-400">
            {error || 'Conversation not found.'}
          </div>
        ) : (
          <>
            <div className="border-b border-slate-700 px-5 py-3 text-xs text-slate-400">
              Keep negotiations and agreements on Nexus.
              {isOwner ? ' You are the opportunity owner.' : ' You are the investor.'}
            </div>

            <div className="h-[420px] space-y-4 overflow-y-auto bg-[#09182D] p-5">
              {messages.length === 0 && (
                <div className="py-16 text-center text-sm text-slate-400">
                  No messages yet. Start the conversation.
                </div>
              )}

              {messages.map(item => {
                const mine = item.sender_id === userId

                return (
                  <div
                    key={item.id}
                    className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                        mine
                          ? 'rounded-br-sm bg-[#E3B967] text-slate-950'
                          : 'rounded-bl-sm bg-slate-700 text-white'
                      }`}
                    >
                      <p
                        className={`mb-2 text-[11px] font-bold ${
                          mine ? 'text-slate-800' : 'text-amber-300'
                        }`}
                      >
                        {mine ? 'You' : 'Other participant'}
                      </p>

                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {item.body}
                      </p>

                      <p
                        className={`mt-2 text-right text-[10px] ${
                          mine ? 'text-slate-700' : 'text-slate-400'
                        }`}
                      >
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })}

              {otherTyping && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-slate-700 px-4 py-3">
                    <p className="mb-2 text-xs text-amber-300">
                      Other participant is typing...
                    </p>

                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-amber-300" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-amber-300 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-amber-300 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={sendMessage}
              className="space-y-3 border-t border-slate-700 p-5"
            >
              <label
                htmlFor="message"
                className="block text-sm font-semibold"
              >
                Your message
              </label>

              <textarea
                id="message"
                value={body}
                onChange={event => handleTyping(event.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={stopTyping}
                placeholder="Write your message here..."
                maxLength={5000}
                rows={3}
                className="w-full resize-y rounded-xl border border-slate-600 bg-slate-800 p-4 text-sm text-white outline-none placeholder:text-slate-400 focus:border-amber-400"
                disabled={sending}
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
                  className="rounded-xl bg-[#E3B967] px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
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
