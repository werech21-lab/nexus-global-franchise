import Link from 'next/link'
import { interpolate } from '@/lib/i18n'
import type { Messages } from '@/lib/i18n'

export default function ListingsPagination({
  page,
  pageCount,
  query,
  messages,
}: {
  page: number
  pageCount: number
  query: Record<string, string | undefined>
  messages: Messages
}) {
  if (pageCount <= 1) return null

  function href(target: number) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value && key !== 'page') params.set(key, value)
    }
    if (target > 1) params.set('page', String(target))
    const qs = params.toString()
    return qs ? `/listings?${qs}` : '/listings'
  }

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label={messages.listings.page}>
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn">
          {messages.listings.previous}
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-slate-400">
        {interpolate(messages.listings.page, { current: page, total: pageCount }) ===
        messages.listings.page
          ? `${messages.listings.page} ${page} / ${pageCount}`
          : interpolate(messages.listings.page, { current: page, total: pageCount })}
      </p>
      {page < pageCount ? (
        <Link href={href(page + 1)} className="btn">
          {messages.listings.next}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
