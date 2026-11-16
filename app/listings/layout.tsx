import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  'Explore Opportunities',
  'Browse franchise, business sale, partnership and exclusive agency listings.',
  '/listings'
)

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
