'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/provider'

export default function NotFound() {
  const t = useT()

  return (
    <section className="space-y-5 py-16 text-center">
      <h1 className="text-3xl font-bold">{t.errors.notFoundTitle}</h1>
      <p className="mx-auto max-w-lg text-slate-300">{t.errors.notFoundBody}</p>
      <Link href="/" className="btn">
        {t.common.backToHome}
      </Link>
    </section>
  )
}
