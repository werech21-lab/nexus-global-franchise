
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

    if (currentUserRef.current === userId) {
      setNotifications(
        Array.from(unreadMap.values()).sort(
          (a, b) =>
            new Date(b.latestAt).getTime() -
            new Date(a.latestAt).getTime()
        )
      )
    }
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
        currentUserRef.current = null
        setAccount(null)
        setNotifications([])
        setMenuOpen(false)
        setBellOpen(false)
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

      currentUserRef.current = user.id

      setAccount({
        id: user.id,
        name,
        email: user.email || 'No email available',
      })

      setLoading(false)
    }

    client.auth
      .getUser()
      .then(({ data }) => updateAccount(data.user))
      .catch(() => {
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
      if (active) void loadNotifications(userId)
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
        setMenuOpen(false)
        setBellOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setBellOpen(false)
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

    currentUserRef.current = null
    setAccount(null)
    setNotifications([])
    setMenuOpen(false)
    setBellOpen(false)

    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="h-10 w-32 animate-pulse rounded-full bg-slate-800" />
    )
  }

  if (!account) {
    return (
      <Link
        href="/login"
        className="inline-flex h-10 items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-5 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/20"
      >
        Sign In
      </Link>
    )
  }

  const initials =
    account.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'U'

  const unreadCount = notifications.reduce(
    (total, item) => total + item.count,
    0
  )

  return (
    <div
      ref={menuRef}
      className="relative flex items-center gap-2 sm:gap-3"
    >
      {/* Bell */}
      <button
        type="button"
        aria-label={`Notifications: ${unreadCount} unread`}
        aria-expanded={bellOpen}
        onClick={() => {
          setBellOpen(!bellOpen)
          setMenuOpen(false)
          void loadNotifications(account.id)
        }}
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
          bellOpen
            ? 'border-amber-400 bg-amber-400/15'
            : 'border-slate-600/60 bg-slate-800/70 hover:border-amber-400/60 hover:bg-slate-700'
        }`}
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#E5C078"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-slate-950 bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Profile */}
      <button
        type="button"
        aria-label="Open account menu"
        aria-expanded={menuOpen}
        onClick={() => {
          setMenuOpen(!menuOpen)
          setBellOpen(false)
        }}
        className={`flex h-11 items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-all duration-200 ${
          menuOpen
            ? 'border-amber-400 bg-slate-700'
            : 'border-slate-600/60 bg-slate-800/70 hover:border-amber-400/60 hover:bg-slate-700'
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-xs font-extrabold text-slate-950 shadow-inner">
          {initials}
        </span>

        <span className="hidden max-w-32 min-w-0 text-left sm:block">
          <span className="block truncate text-xs font-semibold leading-4 text-white">
            {account.name}
          </span>
          <span className="block text-[10px] leading-4 text-slate-400">
            My Account
          </span>
        </span>

        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#E5C078"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`transition-transform ${
            menuOpen ? 'rotate-180' : ''
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Notifications dropdown */}
      {bellOpen && (
        <div className="absolute right-0 top-full z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-700 bg-[#111E32] text-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-700/70 px-4 py-4">
            <div>
              <h3 className="text-sm font-bold">Notifications</h3>
              <p className="mt-1 text-xs text-slate-400">
                Your latest conversations
              </p>
            </div>

            <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
              {unreadCount} unread
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="mb-2 text-2xl">✨</div>
              <p className="text-sm font-medium">
                You are all caught up!
              </p>
              <p className="mt-1 text-xs text-slate-400">
                No unread messages
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-2">
              {notifications.map((notification) => (
                <Link
                  key={notification.conversationId}
                  href={`/dashboard/messages/${notification.conversationId}`}
                  onClick={() => setBellOpen(false)}
                  className="mb-1 flex items-start gap-3 rounded-xl p-3 transition hover:bg-slate-800"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-lg">
                    💬
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      New message
                      {notification.count > 1 ? 's' : ''}
                    </span>

                    <span className="mt-1 block text-xs text-amber-300">
                      {notification.count} unread message
                      {notification.count > 1 ? 's' : ''}
                    </span>

                    <span className="mt-1 block text-[11px] text-slate-400">
                      {new Date(
                        notification.latestAt
                      ).toLocaleString()}
                    </span>
                  </span>

                  <span className="text-amber-300">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Account dropdown */}
      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-3 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-700 bg-[#111E32] text-white shadow-2xl">
          <div className="bg-gradient-to-r from-slate-800 to-[#17263D] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-base font-bold text-slate-950">
                {initials}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {account.name}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Nexus Member
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-b border-slate-700/70 p-4">
            <div>
              <p className="mb-1 text-[11px] text-slate-400">
                Full Name
              </p>
              <p className="break-words text-sm font-medium">
                {account.name}
              </p>
            </div>

            <div>
              <p className="mb-1 text-[11px] text-slate-400">
                Email Address
              </p>
              <p className="break-all text-sm text-amber-200">
                {account.email}
              </p>
            </div>
          </div>

          <div className="space-y-1 p-2">
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-slate-800"
            >
              <span>📊</span>
              <span>My Dashboard</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
            >
              <span>↪</span>
              <span>
                {signingOut ? 'Signing out...' : 'Sign Out'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
