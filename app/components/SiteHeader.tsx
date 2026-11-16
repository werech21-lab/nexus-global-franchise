
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { copy } from '@/lib/copy'
import AccountMenu from './AccountMenu'

const links = [
  { href: '/listings', label: copy.nav.explore },
  { href: '/dashboard', label: copy.nav.dashboard },
]

export default function SiteHeader() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="border-b border-slate-700 p-5">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-4"
        aria-label="Main"
      >
        <Link href="/" className="text-xl font-bold">
          🌐 {copy.site.name}
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          {links.map(link => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <AccountMenu />
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <AccountMenu />
          <button
            type="button"
            className="!bg-slate-800 !px-3 !py-2 !text-amber-200"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? copy.nav.closeMenu : copy.nav.openMenu}
            onClick={() => setOpen(current => !current)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className="mx-auto mt-4 max-w-6xl space-y-2 rounded-2xl border border-slate-700 bg-[#102039] p-4 md:hidden"
        >
          <Link
            href="/"
            className="block rounded-xl px-3 py-3"
            onClick={() => setOpen(false)}
          >
            {copy.nav.home}
          </Link>
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-xl px-3 py-3"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
