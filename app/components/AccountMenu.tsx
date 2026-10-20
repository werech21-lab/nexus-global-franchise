
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Account = {
  id: string
  name: string
  email: string
}

export default function AccountMenu() {
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

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
        setOpen(false)
        setLoading(false)
        return
      }

      const metadata = user.user_metadata || {}

      const possibleName =
        metadata.full_name ||
        metadata.name ||
        metadata.display_name

      const name =
        typeof possibleName === 'string' &&
        possibleName.trim()
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
    function handleOutsideClick(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      )
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
    setOpen(false)
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <span className="text-sm text-slate-400">
        Loading...
      </span>
    )
  }

  if (!account) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open account menu"
        className="flex items-center gap-2 rounded-full border border-amber-500/50 bg-slate-800 px-2 py-1.5 hover:bg-slate-700"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-slate-950">
          {initials || 'U'}
        </span>

        <span className="hidden max-w-28 truncate text-sm font-semibold text-white sm:block">
          {account.name}
        </span>

        <span className="text-xs text-amber-300">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-3 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-900 p-4 text-white shadow-2xl"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-slate-950">
              {initials || 'U'}
            </div>

            <div className="min-w-0">
              <p className="truncate font-bold">
                {account.name}
              </p>
              <p className="text-xs text-slate-400">
                Nexus Member
              </p>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-700 py-4">
            <div>
              <p className="mb-1 text-xs text-slate-400">
                Full Name
              </p>
              <p className="break-words text-sm">
                {account.name}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs text-slate-400">
                Email Address
              </p>
              <p className="break-all text-sm text-amber-300">
                {account.email}
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-700 pt-3">
            <Link
              href="/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
            >
              📊 My Dashboard
            </Link>

            <button
              type="button"
              role="menuitem"
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
