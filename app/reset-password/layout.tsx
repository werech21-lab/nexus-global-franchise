import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  'Reset password',
  'Choose a new password for your account.',
  '/reset-password'
)

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
