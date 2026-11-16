import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  'List an Opportunity',
  'Create a new marketplace listing as a draft.',
  '/listings/new'
)

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
