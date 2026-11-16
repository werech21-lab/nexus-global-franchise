'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/provider'
import type { Account } from '@/types/user'

export default function AccountDropdown({
  account,
  initials,
  open,
  signingOut,
  onToggle,
  onClose,
  onSignOut,
}: {
  account: Account
  initials: string
  open: boolean
  signingOut: boolean
  onToggle: () => void
  onClose: () => void
  onSignOut: () => void
}) {
  const t = useT()

  return (
    <>
      <button
        type="button"
        aria-label={t.accountMenu.openMenu}
        aria-expanded={open}
        onClick={onToggle}
        className={`flex h-10 items-center gap-2 rounded-full border py-1 ps-1 pe-3 transition ${
          open
            ? 'border-amber-400 bg-slate-700'
            : 'border-slate-600/60 bg-slate-800/70 hover:border-amber-400/60 hover:bg-slate-700'
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-xs font-extrabold text-slate-950">
          {initials}
        </span>
        <span className="hidden max-w-32 min-w-0 text-start sm:block">
          <span className="block truncate text-xs font-semibold text-white">
            {account.name}
          </span>
          <span className="block text-[10px] text-slate-400">
            {t.accountMenu.myAccount}
          </span>
        </span>
        <span className="text-xs text-amber-300">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-3 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-700 bg-[#111E32] text-white shadow-2xl">
          <div className="bg-gradient-to-r from-slate-800 to-[#17263D] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 font-bold text-slate-950">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{account.name}</p>
                <p className="mt-1 text-xs text-slate-400">{t.accountMenu.member}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-b border-slate-700/70 p-4">
            <div>
              <p className="mb-1 text-[11px] text-slate-400">{t.accountMenu.fullName}</p>
              <p className="break-words text-sm font-medium">{account.name}</p>
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-400">{t.accountMenu.email}</p>
              <p className="break-all text-sm text-amber-200">{account.email}</p>
            </div>
          </div>

          <div className="space-y-1 p-2">
            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-slate-800"
            >
              <span>📊</span>
              {t.accountMenu.myDashboard}
            </Link>
            <Link
              href="/dashboard/my-inquiries"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-slate-800"
            >
              <span>✉️</span>
              {t.nav.myInquiries}
            </Link>
            <Link
              href="/dashboard/saved"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-slate-800"
            >
              <span>♡</span>
              {t.nav.saved}
            </Link>
            <Link
              href="/dashboard/messages"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-slate-800"
            >
              <span>💬</span>
              {t.dashboard.messages}
            </Link>
            <Link
              href="/account"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-slate-800"
            >
              <span>🔑</span>
              {t.accountMenu.changePassword}
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-sm text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
            >
              <span>↪</span>
              {signingOut ? t.accountMenu.signingOut : t.accountMenu.signOut}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
