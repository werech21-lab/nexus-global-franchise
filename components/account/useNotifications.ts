'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  Conversation,
  ChatMessage,
  ConversationRead,
  MessageNotification,
} from '@/types/conversation'

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<MessageNotification[]>([])
  const currentUserRef = useRef<string | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  currentUserRef.current = userId

  const loadNotifications = useCallback(async (id: string) => {
    const client = supabase
    if (!client) return

    const { data: conversations, error: conversationError } = await client
      .from('conversations')
      .select('id, owner_id, investor_id')
      .or(`owner_id.eq.${id},investor_id.eq.${id}`)

    if (conversationError) {
      console.error('Error loading conversations:', conversationError)
      return
    }

    if (!conversations?.length) {
      if (currentUserRef.current === id) setNotifications([])
      return
    }

    const ids = (conversations as Conversation[]).map(conversation => conversation.id)

    const [messagesResult, readsResult] = await Promise.all([
      client
        .from('messages')
        .select('conversation_id, sender_id, created_at, body')
        .in('conversation_id', ids)
        .neq('sender_id', id)
        .order('created_at', { ascending: false })
        .limit(1000),
      client
        .from('conversation_reads')
        .select('conversation_id, last_read_at')
        .eq('user_id', id)
        .in('conversation_id', ids),
    ])

    if (messagesResult.error || readsResult.error) {
      console.error(
        'Error loading notifications:',
        messagesResult.error || readsResult.error
      )
      return
    }

    const messages = (messagesResult.data || []) as ChatMessage[]
    const reads = (readsResult.data || []) as ConversationRead[]
    const readMap = new Map<string, string>()
    reads.forEach(read => {
      readMap.set(read.conversation_id, read.last_read_at)
    })

    const notificationMap = new Map<string, MessageNotification>()
    const conversationMap = new Map(
      (conversations as Conversation[]).map(chat => [chat.id, chat])
    )

    messages.forEach(message => {
      const lastReadAt = readMap.get(message.conversation_id)
      if (
        lastReadAt &&
        new Date(message.created_at).getTime() <= new Date(lastReadAt).getTime()
      ) {
        return
      }

      const existing = notificationMap.get(message.conversation_id)
      const chat = conversationMap.get(message.conversation_id)
      const senderRoleKey: 'owner' | 'investor' =
        chat?.owner_id === message.sender_id ? 'owner' : 'investor'

      if (existing) {
        existing.count += 1
        if (new Date(message.created_at).getTime() > new Date(existing.latestAt).getTime()) {
          existing.latestAt = message.created_at
          existing.preview = message.body
          existing.senderRoleKey = senderRoleKey
        }
      } else {
        notificationMap.set(message.conversation_id, {
          conversationId: message.conversation_id,
          count: 1,
          latestAt: message.created_at,
          preview: message.body,
          senderRoleKey,
        })
      }
    })

    const nextNotifications = Array.from(notificationMap.values()).sort(
      (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
    )

    if (currentUserRef.current === id) {
      setNotifications(nextNotifications)
    }
  }, [])

  useEffect(() => {
    if (!userId || !supabase) {
      setNotifications([])
      return
    }

    const client = supabase
    const id = userId
    let active = true

    const refresh = () => {
      if (active && currentUserRef.current === id) {
        void loadNotifications(id)
      }
    }

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(refresh, 250)
    }

    refresh()

    const channel = client
      .channel(`nexus-notifications-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => {
          const message = payload.new as { sender_id?: string }
          if (message.sender_id !== id) scheduleRefresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_reads' },
        scheduleRefresh
      )
      .subscribe()

    const interval = window.setInterval(refresh, 15000)
    window.addEventListener('focus', refresh)
    const visibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', visibility)

    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', visibility)
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      void client.removeChannel(channel)
    }
  }, [userId, loadNotifications])

  return { notifications, setNotifications, loadNotifications }
}
