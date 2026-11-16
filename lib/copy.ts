/**
 * @deprecated Import strings from `@/lib/i18n` (getDictionary / useT) instead.
 * Kept as an English fallback so any remaining imports still type-check.
 */
import { en } from '@/lib/i18n/messages/en'

export const copy = en

export const opportunityTypeLabels: Record<string, string> = {
  franchise: en.types.franchise,
  business_sale: en.types.business_sale,
  partnership: en.types.partnership,
  exclusive_agency: en.types.exclusive_agency,
}
