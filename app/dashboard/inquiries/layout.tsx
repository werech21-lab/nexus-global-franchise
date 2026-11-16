import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  'Inquiries',
  'Review and respond to investor inquiries.',
  '/dashboard/inquiries'
)

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
