'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n/provider'
import AccountMenu from '@/components/account/AccountMenu'
import LanguageSwitcher from './LanguageSwitcher'

export default function SiteHeader() {
  const t = useT()
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/listings', label: t.nav.explore },
    { href: '/dashboard', label: t.nav.dashboard },
  ]

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
    <header className="sticky top-0 z-40 border-b border-slate-700 bg-[#081325]/95 p-4 backdrop-blur sm:p-5">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-4"
        aria-label="Main"
      >
        <Link href="/" className="text-xl font-bold">
          🌐 {t.site.name}
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          {links.map(link => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <LanguageSwitcher />
          <AccountMenu />
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <LanguageSwitcher />
          <AccountMenu />
          <button
            type="button"
            className="!bg-slate-800 !px-3 !py-2 !text-amber-200"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            onClick={() => setOpen(current => !current)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className="mx-auto mt-3 max-w-6xl space-y-1 rounded-2xl border border-slate-700 bg-[#102039] p-3 shadow-2xl md:hidden"
        >
          <Link
            href="/"
            className="block rounded-xl px-4 py-3 text-base"
            onClick={() => setOpen(false)}
          >
            {t.nav.home}
          </Link>
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-xl px-4 py-3 text-base"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/dashboard/saved"
            className="block rounded-xl px-4 py-3 text-base"
            onClick={() => setOpen(false)}
          >
            {t.nav.saved}
          </Link>
          <Link
            href="/dashboard/my-inquiries"
            className="block rounded-xl px-4 py-3 text-base"
            onClick={() => setOpen(false)}
          >
            {t.nav.myInquiries}
          </Link>
        </div>
      )}
    </header>
  )
}
