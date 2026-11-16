import {
  COUNTRIES,
  INDUSTRIES,
  LISTING_STATUSES,
  OPPORTUNITY_TYPES,
  isIndustry,
  isListingStatus,
  isOpportunityType,
  type Industry,
  type ListingFormValues,
  type ListingImage,
  type ListingStatus,
  type ListingSummary,
  type OpportunityType,
} from '@/types/listing'
import type { Messages } from '@/lib/i18n'

export {
  COUNTRIES,
  INDUSTRIES,
  LISTING_STATUSES,
  OPPORTUNITY_TYPES,
  isIndustry,
  isListingStatus,
  isOpportunityType,
  type Industry,
  type ListingFormValues,
  type ListingImage,
  type ListingStatus,
  type ListingSummary,
  type OpportunityType,
}

export const LISTING_PAGE_SIZE = 12
export const MAX_LISTING_IMAGES = 8

export type ListingSort = 'newest' | 'investment_asc' | 'investment_desc'

export type ListingSearchParams = {
  q?: string
  country?: string
  industry?: string
  investMin?: string
  investMax?: string
  sort?: ListingSort
  page?: number
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

export function industryLabel(
  industry: string | null | undefined,
  messages: { industries: Record<string, string> }
): string {
  if (!industry) return ''
  return messages.industries[industry] || industry.replaceAll('_', ' ')
}

export function countryLabel(
  country: string | null | undefined,
  messages: { countries: Record<string, string> }
): string {
  if (!country) return ''
  return messages.countries[country] || country
}

export function listingImageUrl(
  pathOrImage: string | { path?: string; signed_url?: string | null } | null | undefined
): string | null {
  if (!pathOrImage) return null
  if (typeof pathOrImage === 'string') {
    if (pathOrImage.startsWith('http://') || pathOrImage.startsWith('https://')) {
      return pathOrImage
    }
    return null
  }
  if (pathOrImage.signed_url) return pathOrImage.signed_url
  if (pathOrImage.path && (pathOrImage.path.startsWith('http://') || pathOrImage.path.startsWith('https://'))) {
    return pathOrImage.path
  }
  return null
}

export function coverPath(listing: ListingSummary): string | null {
  if (listing.cover_path) return listing.cover_path
  const images = listing.listing_images || []
  const cover = images.find(image => image.is_cover) || images[0]
  return cover?.path || null
}

export function coverImageSrc(listing: ListingSummary): string | null {
  if (listing.cover_url) return listing.cover_url
  const images = listing.listing_images || []
  const cover = images.find(image => image.is_cover) || images[0]
  return listingImageUrl(cover) || listingImageUrl(listing.cover_path)
}

export function parseSort(value: string | null | undefined): ListingSort {
  if (value === 'investment_asc' || value === 'investment_desc') return value
  return 'newest'
}

export function toOptionalNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function sanitizeSearchTerm(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/[%_,.()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

export function listingWritePayload(
  values: ListingFormValues,
  status: ListingStatus
) {
  return {
    title: values.title,
    description: values.description,
    country: values.country,
    city: values.city.trim() || null,
    opportunity_type: values.opportunity_type,
    industry: values.industry || null,
    investment_min: toOptionalNumber(values.investment_min),
    investment_max: toOptionalNumber(values.investment_max),
    franchise_fee: toOptionalNumber(values.franchise_fee),
    royalty_percent: toOptionalNumber(values.royalty_percent),
    years_in_business: toOptionalNumber(values.years_in_business),
    currency: values.currency || 'KWD',
    status,
  }
}

export function emptyListingFormValues(): ListingFormValues {
  return {
    title: '',
    description: '',
    country: 'Kuwait',
    city: '',
    opportunity_type: 'franchise',
    industry: '',
    investment_min: '',
    investment_max: '',
    franchise_fee: '',
    royalty_percent: '',
    years_in_business: '',
    currency: 'KWD',
    status: 'draft',
    imageFiles: [],
    coverIndex: 0,
    existingImages: [],
    removedImageIds: [],
  }
}

export function numberToInput(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}
