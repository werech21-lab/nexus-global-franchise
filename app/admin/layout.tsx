import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  'Admin',
  'Administrator tools for users, deals and commissions.',
  '/admin'
)

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
