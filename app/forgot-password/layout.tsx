import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata(
  'Forgot password',
  'Request a password reset link for your account.',
  '/forgot-password'
)

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
