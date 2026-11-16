import type { ReactNode } from 'react'
import './globals.css'
import SiteHeader from '@/components/layout/SiteHeader'
import SiteFooter from '@/components/layout/SiteFooter'
import { I18nProvider } from '@/lib/i18n/provider'
import { getDictionary, getRequestLocale } from '@/lib/i18n/dictionary'
import { localeDir } from '@/lib/i18n'
import { siteMetadata } from '@/lib/seo'

export async function generateMetadata() {
  return siteMetadata()
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale()
  const messages = await getDictionary(locale)

  return (
    <html lang={locale} dir={localeDir(locale)}>
      <body className="flex min-h-screen flex-col">
        <I18nProvider locale={locale} messages={messages}>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 p-6">{children}</main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  )
}
