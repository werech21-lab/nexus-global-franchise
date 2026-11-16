import { createClient } from '@/lib/supabase/server'
import {
  LISTING_PAGE_SIZE,
  parseSort,
  sanitizeSearchTerm,
  type ListingSearchParams,
  type ListingSort,
} from '@/lib/listings'
import type { Listing, ListingSummary } from '@/types/listing'
import { signListingRecords } from '@/lib/listing-images'

const SUMMARY_COLUMNS =
  'id,title,description,country,city,opportunity_type,industry,investment_min,investment_max,franchise_fee,royalty_percent,years_in_business,currency,created_at,listing_images(id,path,sort_order,is_cover)'

const DETAIL_COLUMNS =
  'id,title,description,country,city,opportunity_type,industry,investment_min,investment_max,franchise_fee,royalty_percent,years_in_business,currency,created_at,owner_id,status,listing_images(id,path,sort_order,is_cover)'

export type ListingSearchResult = {
  listings: ListingSummary[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  sort: ListingSort
}

function applySort(query: { order: Function }, sort: ListingSort) {
  if (sort === 'investment_asc') {
    return query.order('investment_min', { ascending: true, nullsFirst: false })
  }
  if (sort === 'investment_desc') {
    return query.order('investment_min', { ascending: false, nullsFirst: false })
  }
  return query.order('created_at', { ascending: false })
}

export async function searchPublishedListings(
  raw: ListingSearchParams
): Promise<ListingSearchResult> {
  const sort = parseSort(raw.sort)
  const page = Math.max(1, Number(raw.page) || 1)
  const pageSize = LISTING_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const empty: ListingSearchResult = {
    listings: [],
    total: 0,
    page,
    pageSize,
    pageCount: 0,
    sort,
  }

  try {
    const supabase = await createClient()
    if (!supabase) return empty

    let query = supabase
      .from('listings')
      .select(SUMMARY_COLUMNS, { count: 'exact' })
      .eq('status', 'published')

    const term = sanitizeSearchTerm(raw.q)
    if (term) {
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%,city.ilike.%${term}%`
      )
    }
    if (raw.country) query = query.eq('country', raw.country)
    if (raw.industry) query = query.eq('industry', raw.industry)

    const min = raw.investMin ? Number(raw.investMin) : NaN
    const max = raw.investMax ? Number(raw.investMax) : NaN
    if (Number.isFinite(min)) {
      query = query.gte('investment_max', min)
    }
    if (Number.isFinite(max)) {
      query = query.lte('investment_min', max)
    }

    query = applySort(query, sort).range(from, to)

    const { data, error, count } = await query
    if (error) return empty

    const total = count || 0
    const listings = await signListingRecords(
      supabase,
      (data || []) as ListingSummary[]
    )
    return {
      listings,
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)) && total > 0 ? Math.ceil(total / pageSize) : 0,
      sort,
    }
  } catch {
    return empty
  }
}

export async function getPublishedListings(): Promise<ListingSummary[]> {
  const result = await searchPublishedListings({ page: 1, sort: 'newest' })
  return result.listings
}

export async function getLatestListings(
  limit = 3
): Promise<ListingSummary[]> {
  try {
    const supabase = await createClient()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('listings')
      .select(SUMMARY_COLUMNS)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return []
    return signListingRecords(supabase, (data || []) as ListingSummary[])
  } catch {
    return []
  }
}

export async function getPublishedListing(
  id: string
): Promise<Listing | null> {
  try {
    const supabase = await createClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('listings')
      .select(DETAIL_COLUMNS)
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle()

    if (error || !data) return null
    const [listing] = await signListingRecords(supabase, [data as Listing])
    return listing
  } catch {
    return null
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    if (!supabase) return null
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

export async function hasExistingInquiry(
  listingId: string,
  investorId: string
): Promise<boolean> {
  try {
    const supabase = await createClient()
    if (!supabase) return false

    const { data, error } = await supabase
      .from('inquiries')
      .select('id')
      .eq('listing_id', listingId)
      .eq('investor_id', investorId)
      .limit(1)
      .maybeSingle()

    return !error && Boolean(data)
  } catch {
    return false
  }
}

export async function isListingSaved(
  listingId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = await createClient()
    if (!supabase) return false
    const { data, error } = await supabase
      .from('saved_listings')
      .select('listing_id')
      .eq('listing_id', listingId)
      .eq('user_id', userId)
      .maybeSingle()
    return !error && Boolean(data)
  } catch {
    return false
  }
}

export type PublicProfile = {
  id: string
  display_name: string | null
  bio: string | null
  avatar: string | null
}

export async function getPublicProfile(
  id: string
): Promise<PublicProfile | null> {
  try {
    const supabase = await createClient()
    if (!supabase) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('id,display_name,bio,avatar')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) return null
    return data as PublicProfile
  } catch {
    return null
  }
}

export async function getPublishedListingsByOwner(
  ownerId: string
): Promise<ListingSummary[]> {
  try {
    const supabase = await createClient()
    if (!supabase) return []
    const { data, error } = await supabase
      .from('listings')
      .select(SUMMARY_COLUMNS)
      .eq('status', 'published')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
    if (error) return []
    return signListingRecords(supabase, (data || []) as ListingSummary[])
  } catch {
    return []
  }
}
