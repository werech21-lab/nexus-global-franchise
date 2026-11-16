import { interpolate } from '@/lib/i18n'
import type { Messages } from '@/lib/i18n'
import { formatMoney } from '@/lib/format'
import type { Locale } from '@/lib/i18n'
import type { ListingSummary } from '@/types/listing'

export function investmentRangeLabel(
  listing: Pick<ListingSummary, 'investment_min' | 'investment_max' | 'currency'>,
  messages: Messages,
  locale: Locale
): string | null {
  const currency = listing.currency || 'KWD'
  const min =
    listing.investment_min === null || listing.investment_min === undefined
      ? null
      : Number(listing.investment_min)
  const max =
    listing.investment_max === null || listing.investment_max === undefined
      ? null
      : Number(listing.investment_max)
  const hasMin = min !== null && Number.isFinite(min)
  const hasMax = max !== null && Number.isFinite(max)
  if (!hasMin && !hasMax) return null
  if (hasMin && hasMax) {
    return interpolate(messages.listings.fromTo, {
      min: formatMoney(min, currency, locale),
      max: formatMoney(max, currency, locale),
    })
  }
  if (hasMin) {
    return interpolate(messages.listings.minOnly, {
      min: formatMoney(min, currency, locale),
    })
  }
  return interpolate(messages.listings.maxOnly, {
    max: formatMoney(max, currency, locale),
  })
}
