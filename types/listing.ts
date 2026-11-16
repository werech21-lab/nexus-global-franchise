export const OPPORTUNITY_TYPES = [
  'franchise',
  'business_sale',
  'partnership',
  'exclusive_agency',
] as const

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number]

export const LISTING_STATUSES = [
  'draft',
  'pending_review',
  'published',
  'rejected',
] as const

export type ListingStatus = (typeof LISTING_STATUSES)[number]

export const INDUSTRIES = [
  'food_beverage',
  'retail',
  'hospitality',
  'education',
  'healthcare',
  'services',
  'technology',
  'real_estate',
  'automotive',
  'beauty',
  'fitness',
  'logistics',
  'other',
] as const

export type Industry = (typeof INDUSTRIES)[number]

export const COUNTRIES = [
  'Kuwait',
  'Saudi Arabia',
  'United Arab Emirates',
  'Qatar',
  'Bahrain',
  'Oman',
  'Egypt',
  'Jordan',
  'Lebanon',
  'Iraq',
  'Morocco',
  'Turkey',
  'United Kingdom',
  'United States',
  'Other',
] as const

export type ListingImage = {
  id: string
  listing_id?: string
  path: string
  sort_order: number
  is_cover: boolean
}

export type ListingSummary = {
  id: string
  title: string
  description: string | null
  country: string | null
  city?: string | null
  opportunity_type: string | null
  industry?: string | null
  investment_min?: number | null
  investment_max?: number | null
  franchise_fee?: number | null
  royalty_percent?: number | null
  years_in_business?: number | null
  currency?: string | null
  created_at?: string
  listing_images?: ListingImage[] | null
  cover_path?: string | null
}

export type Listing = ListingSummary & {
  owner_id: string
  status?: ListingStatus | string
  created_at: string
  rejection_reason?: string | null
  reviewed_at?: string | null
}

export type ListingFormValues = {
  title: string
  description: string
  country: string
  city: string
  opportunity_type: OpportunityType
  industry: Industry | ''
  investment_min: string
  investment_max: string
  franchise_fee: string
  royalty_percent: string
  years_in_business: string
  currency: string
  status: ListingStatus
  imageFiles: File[]
  coverIndex: number
  existingImages: ListingImage[]
  removedImageIds: string[]
}

export function isOpportunityType(value: string): value is OpportunityType {
  return (OPPORTUNITY_TYPES as readonly string[]).includes(value)
}

export function isIndustry(value: string): value is Industry {
  return (INDUSTRIES as readonly string[]).includes(value)
}

export function isListingStatus(value: string): value is ListingStatus {
  return (LISTING_STATUSES as readonly string[]).includes(value)
}
