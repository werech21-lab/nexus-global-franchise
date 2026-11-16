'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/provider'

export default function SiteFooter() {
  const t = useT()
  const footerLinks = [
    { href: '/about', label: t.footer.about },
    { href: '/contact', label: t.footer.contact },
    { href: '/privacy', label: t.footer.privacy },
    { href: '/terms', label: t.footer.terms },
  ]

  return (
    <footer className="border-t border-slate-700 px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-3">
          <p className="text-lg font-bold">🌐 {t.footer.copyright}</p>
          <p className="text-sm text-slate-400">{t.footer.tagline}</p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {footerLinks.map(link => (
            <Link key={link.href} href={link.href} className="text-sm">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
