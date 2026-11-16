import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  'Deals',
  'Track deal approvals and calculated commissions.',
  '/dashboard/deals'
)

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
