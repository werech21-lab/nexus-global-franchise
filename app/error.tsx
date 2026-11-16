'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/provider'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useT()

  return (
    <section className="space-y-5 py-16 text-center">
      <h1 className="text-3xl font-bold">{t.errors.title}</h1>
      <p className="mx-auto max-w-lg text-slate-300">{t.errors.body}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className="btn" onClick={() => reset()}>
          {t.common.retry}
        </button>
        <Link href="/" className="btn">
          {t.common.backToHome}
        </Link>
      </div>
    </section>
  )
}
