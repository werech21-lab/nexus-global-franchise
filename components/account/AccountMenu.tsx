'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n/provider'
import { interpolate } from '@/lib/i18n'
import type { Account } from '@/types/user'
import AccountDropdown from './AccountDropdown'
import NotificationBell from './NotificationBell'
import { useNotifications } from './useNotifications'

export default function AccountMenu() {
  const t = useT()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const { notifications, setNotifications, loadNotifications } = useNotifications(
    account?.id ?? null
  )

  useEffect(() => {
    const client = supabase

    if (!client) {
      setLoading(false)
      return
    }

    let active = true

    function updateAccount(
      user: {
        id: string
        email?: string
        user_metadata?: Record<string, unknown>
      } | null
    ) {
      if (!active) return

      if (!user) {
        setAccount(null)
        setNotifications([])
        setMenuOpen(false)
        setBellOpen(false)
        setLoading(false)
        return
      }

      const metadata = user.user_metadata || {}
      const possibleName =
        metadata.full_name || metadata.name || metadata.display_name
      const name =
        typeof possibleName === 'string' && possibleName.trim()
          ? possibleName.trim()
          : user.email?.split('@')[0] || t.accountMenu.defaultName

      setAccount({
        id: user.id,
        name,
        email: user.email || t.accountMenu.noEmail,
      })
      setLoading(false)
    }

    void client.auth
      .getUser()
      .then(({ data }) => {
        updateAccount(data.user)
      })
      .catch(error => {
        console.error('Authentication error:', error)
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
  }, [setNotifications, t.accountMenu.defaultName, t.accountMenu.noEmail])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
    const client = supabase
    if (!client || signingOut) return

    setSigningOut(true)
    const { error } = await client.auth.signOut()
    setSigningOut(false)

    if (error) {
      alert(interpolate(t.accountMenu.signOutFailed, { error: error.message }))
      return
    }

    setAccount(null)
    setNotifications([])
    setMenuOpen(false)
    setBellOpen(false)
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return <div className="h-10 w-28 animate-pulse rounded-full bg-slate-800" />
  }

  if (!account) {
    return (
      <Link
        href="/login"
        className="inline-flex h-10 items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-5 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/20"
      >
        {t.nav.signIn}
      </Link>
    )
  }

  const initials =
    account.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'U'

  const unreadCount = notifications.reduce(
    (sum, notification) => sum + notification.count,
    0
  )

  return (
    <div ref={menuRef} className="relative flex items-center gap-2 sm:gap-3">
      <NotificationBell
        open={bellOpen}
        unreadCount={unreadCount}
        notifications={notifications}
        onToggle={() => {
          setBellOpen(previous => !previous)
          setMenuOpen(false)
          void loadNotifications(account.id)
        }}
        onClose={() => setBellOpen(false)}
      />
      <AccountDropdown
        account={account}
        initials={initials}
        open={menuOpen}
        signingOut={signingOut}
        onToggle={() => {
          setMenuOpen(previous => !previous)
          setBellOpen(false)
        }}
        onClose={() => setMenuOpen(false)}
        onSignOut={() => void handleSignOut()}
      />
    </div>
  )
}
