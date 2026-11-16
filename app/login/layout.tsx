import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  'Sign in',
  'Sign in or create a Nexus Global Franchise account.',
  '/login'
)

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
