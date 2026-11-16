'use client'

import { useT } from '@/lib/i18n/provider'

export default function Loading() {
  const t = useT()
  return <p className="py-16 text-center text-slate-400">{t.common.loading}</p>
}
