
import Link from 'next/link'
import { copy } from '@/lib/copy'

const footerLinks = [
  { href: '/about', label: copy.footer.about },
  { href: '/contact', label: copy.footer.contact },
  { href: '/privacy', label: copy.footer.privacy },
  { href: '/terms', label: copy.footer.terms },
]

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-700 px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-3">
          <p className="text-lg font-bold">🌐 {copy.footer.copyright}</p>
          <p className="text-sm text-slate-400">{copy.footer.tagline}</p>
          <p className="text-xs text-slate-500">{copy.footer.placeholderNote}</p>
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
