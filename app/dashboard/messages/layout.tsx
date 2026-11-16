import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  'Messages',
  'Private conversations with opportunity owners and investors.',
  '/dashboard/messages'
)

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
