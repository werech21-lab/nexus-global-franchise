import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  'Edit Opportunity',
  'Update one of your marketplace listings.',
  '/listings'
)

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
