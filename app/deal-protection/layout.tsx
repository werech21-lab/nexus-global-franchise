import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  'Deal Protection',
  'Brokerage transparency, introductions and commission protection.',
  '/deal-protection'
)

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
