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
