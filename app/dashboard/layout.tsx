import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  'Dashboard',
  'Manage your opportunities, inquiries, deals and messages.',
  '/dashboard'
)

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
