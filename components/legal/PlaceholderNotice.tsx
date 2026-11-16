'use client'

import { useT } from '@/lib/i18n/provider'

export default function PlaceholderNotice({
  title,
  body,
}: {
  title: string
  body: string
}) {
  const t = useT()

  return (
    <section className="mx-auto max-w-2xl space-y-6 py-10">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p
        role="note"
        className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200"
      >
        {t.placeholders.banner}
      </p>
      <p className="leading-7 text-slate-300">{body}</p>
    </section>
  )
}
