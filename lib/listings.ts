import {
  OPPORTUNITY_TYPES,
  isOpportunityType,
  type ListingFormValues,
  type ListingStatus,
  type ListingSummary,
  type OpportunityType,
} from '@/types/listing'
import type { Messages } from '@/lib/i18n'

export {
  OPPORTUNITY_TYPES,
  isOpportunityType,
  type ListingFormValues,
  type ListingStatus,
  type ListingSummary,
  type OpportunityType,
}

export function opportunityLabel(
  type: string | null | undefined,
  messages: Pick<Messages, 'types' | 'listings'>
): string {
  if (!type) return messages.listings.opportunityFallback
  if (type in messages.types) {
    return messages.types[type as keyof Messages['types']]
  }
  return type.replaceAll('_', ' ')
}
