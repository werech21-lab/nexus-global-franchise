export const OPPORTUNITY_TYPES = [
  'franchise',
  'business_sale',
  'partnership',
  'exclusive_agency',
] as const

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number]

export type ListingStatus = 'draft' | 'published'

export type ListingSummary = {
  id: string
  title: string
  description: string | null
  country: string | null
  opportunity_type: string | null
  created_at?: string
}

export type Listing = ListingSummary & {
  owner_id: string
  status?: ListingStatus | string
  created_at: string
}

export type ListingFormValues = {
  title: string
  description: string
  country: string
  opportunity_type: OpportunityType
  status: ListingStatus
}

export function isOpportunityType(value: string): value is OpportunityType {
  return (OPPORTUNITY_TYPES as readonly string[]).includes(value)
}
