
'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    let active = true

    async function load() {
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

      setUserId(auth.user.id)

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

      setConversation(chat as Conversation)

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

    const channel = client
      .channel(`nexus-chat-${conversationId}`)
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

          setMessages(current => {
            if (
              current.some(item => item.id === incoming.id)
            ) {
              return current
            }

            return [...current, incoming]
          })
        }
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [conversationId, conversation, userId])

  async function sendMessage(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (
      !supabase ||
      !conversation ||
      !userId ||
      !body.trim() ||
      sending
    ) {
      return
    }

    setSending(true)
    setError('')

    const text = body.trim()

    if (text.length > 5000) {
      setError('Message is too long.')
      setSending(false)
      return
    }

    const { data, error: sendError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        body: text
      })
      .select(
        'id,conversation_id,sender_id,body,created_at'
      )
      .single()

    if (sendError) {
      setError(sendError.message)
    } else {
      setBody('')

      if (data) {
        setMessages(current =>
          current.some(item => item.id === data.id)
            ? current
            : [...current, data as Message]
        )
      }
    }

    setSending(false)
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <Link
        href="/dashboard/inquiries"
        className="text-amber-300"
      >
        ← Back to Inquiries
      </Link>

      <div className="card space-y-2">
        <h1 className="text-3xl font-bold">
          Nexus Secure Messenger
        </h1>

        <p className="text-sm text-slate-400">
          Private conversation inside Nexus Global Franchise.
        </p>
      </div>

      {loading ? (
        <p>Loading conversation...</p>
      ) : error && !conversation ? (
        <div className="card text-red-400">
          {error}
        </div>
      ) : conversation ? (
        <>
          <div className="card space-y-4">
            <div className="border-b border-slate-700 pb-3">
              <p className="text-sm text-slate-400">
                Secure conversation
              </p>
              <p className="text-xs text-slate-500">
                Keep negotiations and agreements on Nexus.
              </p>
            </div>

            <div className="max-h-[500px] min-h-[300px] space-y-4 overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-center text-slate-400">
                  No messages yet. Start the conversation.
                </p>
              )}

              {messages.map(item => {
                const mine = item.sender_id === userId

                return (
                  <div
                    key={item.id}
                    className={
                      mine
                        ? 'flex justify-end'
                        : 'flex justify-start'
                    }
                  >
                    <div
                      className={
                        mine
                          ? 'max-w-[85%] rounded-xl bg-amber-500 p-4 text-slate-950'
                          : 'max-w-[85%] rounded-xl bg-slate-700 p-4 text-white'
                      }
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {item.body}
                      </p>

                      <p className="mt-2 text-xs opacity-70">
                        {new Date(
                          item.created_at
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <form
            onSubmit={sendMessage}
            className="card space-y-4"
          >
            <label
              htmlFor="message"
              className="block font-semibold"
            >
              Your message
            </label>

            <textarea
              id="message"
              value={body}
              onChange={event =>
                setBody(event.target.value)
              }
              placeholder="Write your message here..."
              maxLength={5000}
              rows={4}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 p-4 text-white"
              required
            />

            {error && (
              <p role="alert" className="text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn"
              disabled={sending || !body.trim()}
            >
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </>
      ) : null}
    </section>
  )
}
