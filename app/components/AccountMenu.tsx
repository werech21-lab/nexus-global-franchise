
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Account = {
  id: string
  name: string
  email: string
}

type Conversation = {
  id: string
  owner_id: string
  investor_id: string
}

type Message = {
  conversation_id: string
  sender_id: string
  created_at: string
}

type ReadState = {
  conversation_id: string
  last_read_at: string
}

type Notification = {
  conversationId: string
  count: number
  latestAt: string
}

export default function AccountMenu() {
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const currentUserRef = useRef<string | null>(null)

  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  const loadNotifications = useCallback(async (userId: string) => {
    if (!supabase) return

    const client = supabase

    const { data: conversations, error: conversationError } =
      await client
        .from('conversations')
        .select('id, owner_id, investor_id')
        .or(`owner_id.eq.${userId},investor_id.eq.${userId}`)

    if (conversationError) {
      console.error('Conversations:', conversationError)
      return
    }

    if (!conversations?.length) {
      if (currentUserRef.current === userId) {
        setNotifications([])
      }
      return
    }

    const ids = (conversations as Conversation[]).map((c) => c.id)

    const [messagesResult, readsResult] = await Promise.all([
      client
        .from('messages')
        .select('conversation_id, sender_id, created_at')
        .in('conversation_id', ids)
        .neq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(1000),

      client
        .from('conversation_reads')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId)
        .in('conversation_id', ids),
    ])

    if (messagesResult.error || readsResult.error) {
      console.error(
        'Notifications:',
        messagesResult.error || readsResult.error
      )
      return
