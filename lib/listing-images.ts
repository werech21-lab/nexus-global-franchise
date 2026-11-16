import type { SupabaseClient } from '@supabase/supabase-js'
import { MAX_LISTING_IMAGES, type ListingFormValues, type ListingImage } from '@/lib/listings'

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 80) || 'image'
}

export async function syncListingImages(
  client: SupabaseClient,
  listingId: string,
  ownerId: string,
  values: Pick<ListingFormValues, 'imageFiles' | 'coverIndex' | 'existingImages' | 'removedImageIds'>
): Promise<{ error: string | null }> {
  const kept = values.existingImages.filter(
    image => !values.removedImageIds.includes(image.id)
  )

  if (values.removedImageIds.length > 0) {
    const removed = values.existingImages.filter(image =>
      values.removedImageIds.includes(image.id)
    )
    const paths = removed.map(image => image.path).filter(Boolean)
    if (paths.length > 0) {
      await client.storage.from('listing-images').remove(paths)
    }
    const { error } = await client
      .from('listing_images')
      .delete()
      .in('id', values.removedImageIds)
      .eq('listing_id', listingId)
    if (error) return { error: error.message }
  }

  const uploaded: ListingImage[] = []
  for (const [index, file] of values.imageFiles.entries()) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 8)
    const path = `${ownerId}/${listingId}/${crypto.randomUUID()}-${safeFileName(file.name) || `photo.${ext}`}`
    const { error: uploadError } = await client.storage
      .from('listing-images')
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
    if (uploadError) return { error: uploadError.message }

    const { data, error: insertError } = await client
      .from('listing_images')
      .insert({
        listing_id: listingId,
        path,
        sort_order: kept.length + index,
        is_cover: false,
      })
      .select('id,path,sort_order,is_cover')
      .single()

    if (insertError) return { error: insertError.message }
    uploaded.push(data as ListingImage)
  }

  const all = [...kept, ...uploaded]
  if (all.length === 0) return { error: null }

  const coverPos = Math.min(Math.max(values.coverIndex, 0), all.length - 1)
  for (const [index, image] of all.entries()) {
    const { error } = await client
      .from('listing_images')
      .update({ sort_order: index, is_cover: index === coverPos })
      .eq('id', image.id)
      .eq('listing_id', listingId)
    if (error) return { error: error.message }
  }

  return { error: null }
}

export function totalImageCount(values: Pick<ListingFormValues, 'imageFiles' | 'existingImages' | 'removedImageIds'>): number {
  const kept = values.existingImages.filter(
    image => !values.removedImageIds.includes(image.id)
  )
  return kept.length + values.imageFiles.length
}

export { MAX_LISTING_IMAGES }

export async function signListingImagePaths(
  client: SupabaseClient,
  paths: Array<string | null | undefined>,
  expiresIn = 3600
): Promise<Record<string, string>> {
  const unique = [
    ...new Set(
      paths.filter((path): path is string => {
        return Boolean(path) && !path!.startsWith('http://') && !path!.startsWith('https://')
      })
    ),
  ]
  if (unique.length === 0) return {}

  const { data, error } = await client.storage
    .from('listing-images')
    .createSignedUrls(unique, expiresIn)

  if (error || !data) return {}

  const urls: Record<string, string> = {}
  data.forEach((row, index) => {
    const path = row.path || unique[index]
    if (path && row.signedUrl) urls[path] = row.signedUrl
  })
  return urls
}

type WithImages = {
  listing_images?: ListingImage[] | null
  cover_path?: string | null
  cover_url?: string | null
}

export function applySignedUrls<T extends WithImages>(
  listing: T,
  urls: Record<string, string>
): T {
  const images = (listing.listing_images || []).map(image => ({
    ...image,
    signed_url: urls[image.path] || image.signed_url || null,
  }))
  const cover = images.find(image => image.is_cover) || images[0]
  const coverUrl =
    listing.cover_url ||
    cover?.signed_url ||
    (cover ? urls[cover.path] : undefined) ||
    (listing.cover_path ? urls[listing.cover_path] : undefined) ||
    null

  return {
    ...listing,
    listing_images: images,
    cover_url: coverUrl,
  }
}

export async function signListingRecords<T extends WithImages>(
  client: SupabaseClient,
  listings: T[],
  expiresIn = 3600
): Promise<T[]> {
  const paths = listings.flatMap(listing => [
    listing.cover_path,
    ...(listing.listing_images || []).map(image => image.path),
  ])
  const urls = await signListingImagePaths(client, paths, expiresIn)
  return listings.map(listing => applySignedUrls(listing, urls))
}
