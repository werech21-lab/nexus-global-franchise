import { localeTag, type Locale } from '@/lib/i18n'

export function formatMoney(
  amount: number | null | undefined,
  currency: string,
  locale: Locale,
  empty = '—'
): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return empty
  }

  const value = Number(amount)
  const formatted = value.toLocaleString(localeTag(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return `${formatted} ${currency || 'KWD'}`
}

export function formatDate(
  value: string | null | undefined,
  locale: Locale,
  empty = '—'
): string {
  if (!value) return empty
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return empty
  return date.toLocaleDateString(localeTag(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(
  value: string | null | undefined,
  locale: Locale,
  empty = '—'
): string {
  if (!value) return empty
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return empty
  return date.toLocaleString(localeTag(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function paymentStatusLabel(
  status: string | null | undefined,
  labels: { pending: string; paid: string; none: string; awaiting?: string }
): string {
  if (!status) return labels.none
  if (status === 'pending') return labels.pending
  if (status === 'paid') return labels.paid
  if (status === 'awaiting_confirmation' && labels.awaiting) return labels.awaiting
  return status.replace(/_/g, ' ')
}

export function pickLatestPayment<
  T extends { status: string; paid_at?: string | null; due_at?: string | null },
>(payments: T[]): T | null {
  if (payments.length === 0) return null
  const paid = payments.filter(payment => payment.status === 'paid')
  const pool = paid.length > 0 ? paid : payments
  return [...pool].sort((a, b) => {
    const aTime = Date.parse(a.paid_at || a.due_at || '') || 0
    const bTime = Date.parse(b.paid_at || b.due_at || '') || 0
    return bTime - aTime
  })[0]
}
