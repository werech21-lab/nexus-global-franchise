'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/provider'
import type { Locale } from '@/lib/i18n'

export default function LanguageSwitcher() {
  const { locale, messages } = useI18n()
  const [pending, setPending] = useState(false)

  async function setLocale(next: Locale) {
    if (next === locale || pending) return
    setPending(true)
    try {
      const response = await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      })
      if (!response.ok) return
      window.location.reload()
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="inline-flex items-center overflow-hidden rounded-full border border-slate-600 bg-slate-800/80 text-xs font-semibold"
      role="group"
      aria-label={messages.nav.language}
    >
      <button
        type="button"
        className={`!rounded-none !px-3 !py-1.5 !text-xs ${
          locale === 'ar'
            ? '!bg-amber-400 !text-slate-950'
            : '!bg-transparent !text-slate-200'
        }`}
        aria-pressed={locale === 'ar'}
        disabled={pending}
        onClick={() => void setLocale('ar')}
      >
        {messages.nav.arabic}
      </button>
      <button
        type="button"
        className={`!rounded-none !px-3 !py-1.5 !text-xs ${
          locale === 'en'
            ? '!bg-amber-400 !text-slate-950'
            : '!bg-transparent !text-slate-200'
        }`}
        aria-pressed={locale === 'en'}
        disabled={pending}
        onClick={() => void setLocale('en')}
      >
        {messages.nav.english}
      </button>
    </div>
  )
}
