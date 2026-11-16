
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { pageMetadata, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'

type Props = {
  children: ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const fallback = pageMetadata(
    SITE_NAME,
    SITE_DESCRIPTION,
    `/listings/${id}`
  )

  try {
    const supabase = await createClient()
    if (!supabase) return fallback

    const { data } = await supabase
      .from('listings')
      .select('title, description, status')
      .eq('id', id)
      .maybeSingle()

    if (!data?.title) return fallback

    const description =
      (data.description || SITE_DESCRIPTION).slice(0, 160)

    return pageMetadata(data.title, description, `/listings/${id}`)
  } catch {
    return fallback
  }
}

export default function ListingLayout({ children }: Props) {
  return children
}
