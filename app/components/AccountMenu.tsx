
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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

  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  const loadNotifications = useCallback(async (userId: string) => {
    if (!supabase) return

    const client = supabase

    const { data: conversations, error: conversationsError } =
      await client
        .from('conversations')
        .select('id, owner_id, investor_id')
        .or(`owner_id.eq.${userId},investor_id.eq.${userId}`)

    if (conversationsError || !conversations?.length) {
      setNotifications([])
      return
    }

    const conversationList = conversations as Conversation[]
    const ids = conversationList.map((c) => c.id)

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
        'Notification error:',
        messagesResult.error || readsResult.error
      )
      return
    }

    const messages = (messagesResult.data || []) as Message[]
    const reads = (readsResult.data || []) as ReadState[]

    const readMap = new Map(
      reads.map((r) => [r.conversation_id, r.last_read_at])
    )

    const unreadMap = new Map<string, Notification>()

    for (const message of messages) {
      const lastRead = readMap.get(message.conversation_id)

      if (
        lastRead &&
        new Date(message.created_at).getTime() <=
          new Date(lastRead).getTime()
      ) {
        continue
      }

      const existing = unreadMap.get(message.conversation_id)

      if (existing) {
        existing.count += 1
      } else {
        unreadMap.set(message.conversation_id, {
          conversationId: message.conversation_id,
          count: 1,
          latestAt: message.created_at,
        })
      }
    }

    setNotifications(
      Array.from(unreadMap.values()).sort(
        (a, b) =>
          new Date(b.latestAt).getTime() -
          new Date(a.latestAt).getTime()
      )
    )
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const client = supabase
    let active = true

    function updateAccount(user: {
      id: string
      email?: string
      user_metadata?: Record<string, unknown>
    } | null) {
      if (!active) return

      if (!user) {
        setAccount(null)
        setNotifications([])
        setOpen(false)
        setNotificationsOpen(false)
        setLoading(false)
        return
      }

      const metadata = user.user_metadata || {}
      const possibleName =
        metadata.full_name ||
        metadata.name ||
        metadata.display_name

      const name =
        typeof possibleName === 'string' && possibleName.trim()
          ? possibleName.trim()
          : user.email?.split('@')[0] || 'Nexus User'

      setAccount({
        id: user.id,
        name,
        email: user.email || 'No email available',
      })

      setLoading(false)
    }

    client.auth.getUser().then(({ data }) => {
      updateAccount(data.user)
    }).catch(() => {
      if (active) setLoading(false)
    })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      updateAccount(session?.user || null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!account) return

    const userId = account.id
    let active = true

    const refresh = () => {
      if (active) {
        void loadNotifications(userId)
      }
    }

    refresh()

    const interval = window.setInterval(refresh, 15000)

    window.addEventListener('focus', refresh)

    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
    }
  }, [account?.id, loadNotifications])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
        setNotificationsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  async function handleSignOut() {
    if (!supabase || signingOut) return

    setSigningOut(true)

    const { error } = await supabase.auth.signOut()

    setSigningOut(false)

    if (error) {
      alert('Could not sign out: ' + error.message)
      return
    }

    setAccount(null)
    setNotifications([])
    setOpen(false)
    setNotificationsOpen(false)
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return <span className="text-sm text-slate-400">Loading...</span>
  }

  if (!account) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950"
      >
        Login
      </Link>
    )
  }

  const initials = account.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  const unreadCount = notifications.reduce(
    (total, item) => total + item.count,
    0
  )

  return (
    <div ref={menuRef} className="relative flex items-center gap-3">

      {/* Notifications bell */}
      <button
        type="button"
        onClick={() => {
          setNotificationsOpen(!notificationsOpen)
          setOpen(false)
          void loadNotifications(account.id)
        }}
        aria-label={`Notifications: ${unreadCount} unread messages`}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-amber-500/50 bg-slate-800 text-xl hover:bg-slate-700"
      >
        🔔

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Account button */}
      <button
        type="button"
        onClick={() => {
          setOpen(!open)
          setNotificationsOpen(false)
        }}
        aria-label="Open account menu"
        className="flex items-center gap-2 rounded-full border border-amber-500/50 bg-slate-800 px-2 py-1.5 hover:bg-slate-700"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-slate-950">
          {initials || 'U'}
        </span>

        <span className="hidden max-w-28 truncate text-sm font-semibold text-white sm:block">
          {account.name}
        </span>

        <span className="text-xs text-amber-300">▾</span>
      </button>

      {/* Notifications dropdown */}
      {notificationsOpen && (
        <div className="absolute right-0 top-full z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-900 p-4 text-white shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">🔔 Notifications</h3>
            <span className="text-xs text-amber-300">
              {unreadCount} unread
            </span>
          </div>

          {notifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              No new messages
            </p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {notifications.map((notification) => (
                <Link
                  key={notification.conversationId}
                  href={`/dashboard/messages/${notification.conversationId}`}
                  onClick={() => setNotificationsOpen(false)}
                  className="block rounded-lg border border-slate-700 bg-slate-800 p-3 hover:border-amber-500"
                >
                  <p className="text-sm font-semibold text-white">
                    💬 New message
                    {notification.count > 1 ? 's' : ''}
                  </p>

                  <p className="mt-1 text-xs text-amber-300">
                    {notification.count} unread message
                    {notification.count > 1 ? 's' : ''}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(notification.latestAt).toLocaleString()}
                  </p>

                  <p className="mt-2 text-xs text-slate-300">
                    Click to open conversation →
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Account dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-900 p-4 text-white shadow-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-slate-950">
              {initials || 'U'}
            </div>

            <div className="min-w-0">
              <p className="truncate font-bold">{account.name}</p>
              <p className="text-xs text-slate-400">Nexus Member</p>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-700 py-4">
            <div>
              <p className="mb-1 text-xs text-slate-400">Full Name</p>
              <p className="break-words text-sm">{account.name}</p>
            </div>

            <div>
              <p className="mb-1 text-xs text-slate-400">Email Address</p>
              <p className="break-all text-sm text-amber-300">
                {account.email}
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-700 pt-3">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
            >
              📊 My Dashboard
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full rounded-lg bg-red-500/10 px-3 py-2 text-left text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
            >
              {signingOut ? 'Signing out...' : '🚪 Sign Out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
