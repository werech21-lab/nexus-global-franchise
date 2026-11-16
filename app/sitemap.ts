import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { createClient } from '@/lib/supabase/server'

const staticPaths = [
  '',
  '/listings',
  '/login',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/deal-protection',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = staticPaths.map(path => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '/listings' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }))

  try {
    const supabase = await createClient()
    if (supabase) {
      const { data } = await supabase
        .from('listings')
        .select('id, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(200)

      for (const listing of data || []) {
        entries.push({
          url: `${SITE_URL}/listings/${listing.id}`,
          lastModified: listing.created_at
            ? new Date(listing.created_at)
            : new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
        })
      }
    }
  } catch {
    // Placeholder env or missing tables should not fail the build.
  }

  return entries
}
