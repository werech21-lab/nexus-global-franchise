
import type { ReactNode } from 'react'
import './globals.css'
import SiteHeader from './components/SiteHeader'
import SiteFooter from './components/SiteFooter'
import { defaultMetadata } from '@/lib/seo'

export const metadata = defaultMetadata

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 p-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
