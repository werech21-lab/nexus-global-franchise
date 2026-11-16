import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { getDictionary } from '@/lib/i18n/dictionary'
import { localizedMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary()
  return localizedMetadata(t.deals.title, t.deals.meta, '/dashboard/deals')
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
