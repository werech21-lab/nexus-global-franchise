
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
  const [otherTyping, setOtherTyping] = useState(false)
  const typingChannelRef = useRef<RealtimeChannel | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingActiveRef = useRef(false)

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
