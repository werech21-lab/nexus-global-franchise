import { createClient } from '@/lib/supabase/server'
import type { Listing, ListingSummary } from '@/types/listing'

const SUMMARY_COLUMNS =
  'id,title,description,country,opportunity_type,created_at'

const DETAIL_COLUMNS =
  'id,title,description,country,opportunity_type,created_at,owner_id,status'

export async function getPublishedListings(): Promise<ListingSummary[]> {
  try {
    const supabase = await createClient()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('listings')
      .select(SUMMARY_COLUMNS)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) return []
    return (data || []) as ListingSummary[]
  } catch {
    return []
  }
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
    return (data || []) as ListingSummary[]
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
    return data as Listing
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
